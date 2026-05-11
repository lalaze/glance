package glance

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

var cliproxyQuotaWidgetTemplate = mustParseTemplate("cliproxy-quota.html", "widget-base.html")

const (
	cliproxyCodexUsageURL       = "https://chatgpt.com/backend-api/wham/usage"
	cliproxyCodexUserAgent      = "codex_cli_rs/0.76.0 (Debian 13.0.0; x86_64) WindowsTerminal"
	cliproxyDefaultQuotaTimeout = 20 * time.Second
)

const (
	cliproxyQuotaProviderCLIProxy = "cliproxy"
	cliproxyQuotaProviderSub2API  = "sub2api"
)

type cliproxyQuotaWidget struct {
	widgetBase       `yaml:",inline"`
	Provider         string                 `yaml:"provider"`
	URL              string                 `yaml:"url"`
	ManagementKey    string                 `yaml:"management-key"`
	AllowInsecure    bool                   `yaml:"allow-insecure"`
	Timeout          durationField          `yaml:"timeout"`
	PollInterval     durationField          `yaml:"poll-interval"`
	Accounts         []cliproxyQuotaAccount `yaml:"-"`
	managementAPIURL string
	client           *http.Client
}

func (widget *cliproxyQuotaWidget) initialize() error {
	widget.withTitle("Codex Quota").withCacheDuration(15 * time.Minute)

	if strings.TrimSpace(widget.URL) == "" {
		return errors.New("url is required")
	}

	parsedURL, err := url.Parse(strings.TrimSpace(widget.URL))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("invalid url: %s", widget.URL)
	}

	if strings.TrimSpace(widget.ManagementKey) == "" {
		return errors.New("management-key is required")
	}

	provider := strings.ToLower(strings.TrimSpace(widget.Provider))
	if provider == "" {
		provider = cliproxyQuotaProviderCLIProxy
	}
	switch provider {
	case cliproxyQuotaProviderCLIProxy, cliproxyQuotaProviderSub2API:
		widget.Provider = provider
	default:
		return fmt.Errorf("invalid provider: %s", widget.Provider)
	}

	managementAPIURL := strings.TrimRight(parsedURL.String(), "/")
	if widget.Provider == cliproxyQuotaProviderCLIProxy && !strings.HasSuffix(managementAPIURL, "/v0/management") {
		managementAPIURL += "/v0/management"
	}
	if widget.Provider == cliproxyQuotaProviderSub2API && !strings.HasSuffix(managementAPIURL, "/api/v1/admin") {
		managementAPIURL += "/api/v1/admin"
	}

	timeout := cliproxyDefaultQuotaTimeout
	if widget.Timeout > 0 {
		timeout = time.Duration(widget.Timeout)
	}

	widget.managementAPIURL = managementAPIURL
	widget.client = newCliproxyQuotaHTTPClient(timeout, widget.AllowInsecure)

	return nil
}

func (widget *cliproxyQuotaWidget) update(ctx context.Context) {
	accounts, err := widget.fetchCodexQuota(ctx)
	if !widget.canContinueUpdateAfterHandlingErr(err) {
		return
	}

	widget.Accounts = accounts
}

func (widget *cliproxyQuotaWidget) Render() template.HTML {
	return widget.renderTemplate(widget, cliproxyQuotaWidgetTemplate)
}

func (widget *cliproxyQuotaWidget) PollIntervalMilliseconds() int64 {
	if widget.PollInterval <= 0 {
		return 0
	}

	return time.Duration(widget.PollInterval).Milliseconds()
}

func (widget *cliproxyQuotaWidget) TotalAccount() *cliproxyQuotaAccount {
	windows := aggregateCliproxyQuotaWindows(widget.Accounts)
	if len(windows) == 0 {
		return nil
	}

	return &cliproxyQuotaAccount{
		Name:    "All accounts",
		Plan:    "Total",
		Windows: windows,
	}
}

type cliproxyAuthFilesResponse struct {
	Files []cliproxyAuthFile `json:"files"`
}

type cliproxyAuthFile struct {
	ID            string         `json:"id"`
	AuthIndex     string         `json:"auth_index"`
	AuthIndexAlt  string         `json:"authIndex"`
	Name          string         `json:"name"`
	Type          string         `json:"type"`
	Provider      string         `json:"provider"`
	Label         string         `json:"label"`
	Status        string         `json:"status"`
	StatusMessage string         `json:"status_message"`
	Email         string         `json:"email"`
	Account       string         `json:"account"`
	AccountType   string         `json:"account_type"`
	Disabled      bool           `json:"disabled"`
	Unavailable   bool           `json:"unavailable"`
	RuntimeOnly   bool           `json:"runtime_only"`
	IDToken       any            `json:"id_token"`
	Metadata      map[string]any `json:"metadata"`
	Attributes    map[string]any `json:"attributes"`
}

type cliproxyAPICallRequest struct {
	AuthIndex string            `json:"auth_index"`
	Method    string            `json:"method"`
	URL       string            `json:"url"`
	Header    map[string]string `json:"header"`
	Data      string            `json:"data,omitempty"`
}

type cliproxyAPICallResponse struct {
	StatusCode    int                 `json:"status_code"`
	StatusCodeAlt int                 `json:"statusCode"`
	Header        map[string][]string `json:"header"`
	Body          any                 `json:"body"`
}

type cliproxyQuotaAccount struct {
	Name      string
	Plan      string
	AuthIndex string
	Windows   []cliproxyQuotaWindow
	Error     string
}

type cliproxyQuotaWindow struct {
	ID               string
	Label            string
	RemainingPercent *float64
	ResetLabel       string
	ResetAt          *time.Time
}

type sub2APIAccountsResponse struct {
	Items []sub2APIAccount `json:"items"`
}

type sub2APIAccount struct {
	ID                 int64   `json:"id"`
	Name               string  `json:"name"`
	Platform           string  `json:"platform"`
	Type               string  `json:"type"`
	Status             string  `json:"status"`
	ErrorMessage       string  `json:"error_message"`
	QuotaLimit         float64 `json:"quota_limit"`
	QuotaUsed          float64 `json:"quota_used"`
	QuotaDailyLimit    float64 `json:"quota_daily_limit"`
	QuotaDailyUsed     float64 `json:"quota_daily_used"`
	QuotaWeeklyLimit   float64 `json:"quota_weekly_limit"`
	QuotaWeeklyUsed    float64 `json:"quota_weekly_used"`
	QuotaDailyResetAt  string  `json:"quota_daily_reset_at"`
	QuotaWeeklyResetAt string  `json:"quota_weekly_reset_at"`
}

type sub2APIUsageInfo struct {
	FiveHour            *sub2APIUsageProgress `json:"five_hour"`
	SevenDay            *sub2APIUsageProgress `json:"seven_day"`
	SevenDaySonnet      *sub2APIUsageProgress `json:"seven_day_sonnet"`
	SubscriptionTier    string                `json:"subscription_tier"`
	SubscriptionTierRaw string                `json:"subscription_tier_raw"`
	Error               string                `json:"error"`
}

type sub2APIUsageProgress struct {
	Utilization      float64 `json:"utilization"`
	ResetsAt         string  `json:"resets_at"`
	RemainingSeconds int     `json:"remaining_seconds"`
}

func newCliproxyQuotaHTTPClient(timeout time.Duration, allowInsecure bool) *http.Client {
	transport := &http.Transport{
		MaxIdleConnsPerHost: 10,
		Proxy:               http.ProxyFromEnvironment,
	}

	if allowInsecure {
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}
}

func (widget *cliproxyQuotaWidget) fetchCodexQuota(ctx context.Context) ([]cliproxyQuotaAccount, error) {
	if widget.Provider == cliproxyQuotaProviderSub2API {
		return widget.fetchSub2APICodexQuota(ctx)
	}

	return widget.fetchCLIProxyCodexQuota(ctx)
}

func (widget *cliproxyQuotaWidget) fetchCLIProxyCodexQuota(ctx context.Context) ([]cliproxyQuotaAccount, error) {
	authFiles, err := widget.fetchAuthFiles(ctx)
	if err != nil {
		return nil, err
	}

	accounts := make([]cliproxyQuotaAccount, 0, len(authFiles))
	for i := range authFiles {
		authFile := &authFiles[i]
		if !authFile.isActiveCodex() {
			continue
		}

		account := cliproxyQuotaAccount{
			Name:      authFile.displayName(),
			Plan:      formatCliproxyCodexPlan(authFile.planType()),
			AuthIndex: authFile.index(),
		}

		accountID := authFile.codexAccountID()
		if account.AuthIndex == "" {
			account.Error = "missing auth_index"
			accounts = append(accounts, account)
			continue
		}
		if accountID == "" {
			account.Error = "missing ChatGPT account ID"
			accounts = append(accounts, account)
			continue
		}

		usage, err := widget.fetchCodexUsage(ctx, account.AuthIndex, accountID)
		if err != nil {
			account.Error = err.Error()
			accounts = append(accounts, account)
			continue
		}

		if planType := formatCliproxyCodexPlan(cliproxyStringValueFromMap(usage, "plan_type", "planType")); planType != "" {
			account.Plan = planType
		}
		account.Windows = parseCliproxyCodexQuotaWindows(usage)
		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (widget *cliproxyQuotaWidget) fetchSub2APICodexQuota(ctx context.Context) ([]cliproxyQuotaAccount, error) {
	sub2APIAccounts, err := widget.fetchSub2APIAccounts(ctx)
	if err != nil {
		return nil, err
	}

	accounts := make([]cliproxyQuotaAccount, 0, len(sub2APIAccounts))
	for _, sub2APIAccount := range sub2APIAccounts {
		if !sub2APIAccount.isOpenAICodexAccount() {
			continue
		}

		account := cliproxyQuotaAccount{
			Name:      sub2APIAccount.displayName(),
			Plan:      sub2APIAccount.displayPlan(),
			AuthIndex: strconv.FormatInt(sub2APIAccount.ID, 10),
			Error:     strings.TrimSpace(sub2APIAccount.ErrorMessage),
		}

		usage, err := widget.fetchSub2APIUsage(ctx, sub2APIAccount.ID)
		if err != nil {
			account.Error = err.Error()
			accounts = append(accounts, account)
			continue
		}

		if plan := sub2APIUsagePlan(usage); plan != "" {
			account.Plan = plan
		}
		if strings.TrimSpace(usage.Error) != "" {
			account.Error = strings.TrimSpace(usage.Error)
		}
		account.Windows = parseSub2APIQuotaWindows(usage, sub2APIAccount)
		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (widget *cliproxyQuotaWidget) fetchSub2APIAccounts(ctx context.Context) ([]sub2APIAccount, error) {
	var response sub2APIAccountsResponse
	if err := widget.decodeSub2APIManagementJSON(ctx, http.MethodGet, "/accounts?page=1&page_size=1000&platform=openai", nil, &response); err != nil {
		return nil, fmt.Errorf("fetching Sub2API accounts: %w", err)
	}

	return response.Items, nil
}

func (widget *cliproxyQuotaWidget) fetchSub2APIUsage(ctx context.Context, accountID int64) (sub2APIUsageInfo, error) {
	var usage sub2APIUsageInfo
	if err := widget.decodeSub2APIManagementJSON(ctx, http.MethodGet, fmt.Sprintf("/accounts/%d/usage?source=active", accountID), nil, &usage); err != nil {
		return usage, fmt.Errorf("fetching Sub2API account usage: %w", err)
	}

	return usage, nil
}

func (widget *cliproxyQuotaWidget) fetchAuthFiles(ctx context.Context) ([]cliproxyAuthFile, error) {
	var response cliproxyAuthFilesResponse
	if err := widget.decodeManagementJSON(ctx, http.MethodGet, "/auth-files", nil, &response); err != nil {
		return nil, fmt.Errorf("fetching auth files: %w", err)
	}

	return response.Files, nil
}

func (widget *cliproxyQuotaWidget) fetchCodexUsage(ctx context.Context, authIndex, accountID string) (map[string]any, error) {
	apiCallRequest := cliproxyAPICallRequest{
		AuthIndex: authIndex,
		Method:    http.MethodGet,
		URL:       cliproxyCodexUsageURL,
		Header: map[string]string{
			"Authorization":      "Bearer $TOKEN$",
			"Content-Type":       "application/json",
			"Chatgpt-Account-Id": accountID,
			"User-Agent":         cliproxyCodexUserAgent,
		},
	}

	var response cliproxyAPICallResponse
	if err := widget.decodeManagementJSON(ctx, http.MethodPost, "/api-call", apiCallRequest, &response); err != nil {
		return nil, fmt.Errorf("fetching Codex usage: %w", err)
	}

	statusCode := response.statusCode()
	if statusCode < http.StatusOK || statusCode >= http.StatusMultipleChoices {
		responseBody, _ := limitStringLength(strings.TrimSpace(string(response.bodyBytes())), 256)
		if responseBody == "" {
			responseBody = http.StatusText(statusCode)
		}
		return nil, fmt.Errorf("Codex usage request returned %d: %s", statusCode, responseBody)
	}

	body := response.bodyBytes()
	if len(bytes.TrimSpace(body)) == 0 {
		return nil, errors.New("Codex usage response is empty")
	}

	var usage map[string]any
	if err := json.Unmarshal(body, &usage); err != nil {
		return nil, fmt.Errorf("parsing Codex usage response: %w", err)
	}

	if len(usage) == 0 {
		return nil, errors.New("Codex usage response is empty")
	}

	return usage, nil
}

func (widget *cliproxyQuotaWidget) decodeManagementJSON(ctx context.Context, method, path string, body any, out any) error {
	var bodyReader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("encoding request body: %w", err)
		}
		bodyReader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, widget.managementAPIURL+path, bodyReader)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(widget.ManagementKey))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := widget.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		truncatedBody, _ := limitStringLength(strings.TrimSpace(string(respBody)), 256)
		if truncatedBody == "" {
			truncatedBody = resp.Status
		}
		return fmt.Errorf("unexpected status code %d from %s: %s", resp.StatusCode, req.URL, truncatedBody)
	}

	if err := json.Unmarshal(respBody, out); err != nil {
		return err
	}

	return nil
}

func (widget *cliproxyQuotaWidget) decodeSub2APIManagementJSON(ctx context.Context, method, path string, body any, out any) error {
	var bodyReader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("encoding request body: %w", err)
		}
		bodyReader = bytes.NewReader(encoded)
	}

	req, err := http.NewRequestWithContext(ctx, method, widget.managementAPIURL+path, bodyReader)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-api-key", strings.TrimSpace(widget.ManagementKey))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := widget.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusOK {
		truncatedBody, _ := limitStringLength(strings.TrimSpace(string(respBody)), 256)
		if truncatedBody == "" {
			truncatedBody = resp.Status
		}
		return fmt.Errorf("unexpected status code %d from %s: %s", resp.StatusCode, req.URL, truncatedBody)
	}

	return decodeSub2APIResponseJSON(respBody, out)
}

func decodeSub2APIResponseJSON(body []byte, out any) error {
	var object map[string]json.RawMessage
	if err := json.Unmarshal(body, &object); err == nil {
		if _, hasCode := object["code"]; hasCode {
			var code int
			if err := json.Unmarshal(object["code"], &code); err != nil {
				return err
			}
			if code != 0 {
				message := "Sub2API request failed"
				if rawMessage, ok := object["message"]; ok {
					_ = json.Unmarshal(rawMessage, &message)
				}
				return errors.New(message)
			}
		}

		if rawData, hasData := object["data"]; hasData {
			if out == nil {
				return nil
			}
			return decodeSub2APIDataJSON(rawData, out)
		}
	}

	if out == nil {
		return nil
	}

	return decodeSub2APIDataJSON(body, out)
}

func decodeSub2APIDataJSON(body []byte, out any) error {
	if err := json.Unmarshal(body, out); err == nil {
		return nil
	} else if accountsResponse, ok := out.(*sub2APIAccountsResponse); ok {
		var accounts []sub2APIAccount
		if arrayErr := json.Unmarshal(body, &accounts); arrayErr == nil {
			accountsResponse.Items = accounts
			return nil
		}
		return err
	} else {
		return err
	}
}

func (response *cliproxyAPICallResponse) statusCode() int {
	if response.StatusCode != 0 {
		return response.StatusCode
	}

	return response.StatusCodeAlt
}

func (response *cliproxyAPICallResponse) bodyBytes() []byte {
	switch typed := response.Body.(type) {
	case string:
		return []byte(typed)
	case nil:
		return nil
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return nil
		}
		return encoded
	}
}

func (authFile *cliproxyAuthFile) isActiveCodex() bool {
	if authFile == nil || !strings.EqualFold(authFile.provider(), "codex") {
		return false
	}

	if authFile.Disabled || authFile.Unavailable {
		return false
	}

	switch strings.ToLower(strings.TrimSpace(authFile.Status)) {
	case "disabled", "unavailable", "removed":
		return false
	default:
		return true
	}
}

func (authFile *cliproxyAuthFile) provider() string {
	if strings.TrimSpace(authFile.Provider) != "" {
		return strings.TrimSpace(authFile.Provider)
	}

	return strings.TrimSpace(authFile.Type)
}

func (authFile *cliproxyAuthFile) index() string {
	if strings.TrimSpace(authFile.AuthIndex) != "" {
		return strings.TrimSpace(authFile.AuthIndex)
	}

	return strings.TrimSpace(authFile.AuthIndexAlt)
}

func (authFile *cliproxyAuthFile) displayName() string {
	for _, candidate := range []string{
		authFile.Label,
		authFile.Email,
		cliproxyStringValueFromAny(authFile.IDToken, "email"),
		cliproxyCodexValueFromJWT(authFile.IDToken, "email"),
		authFile.Account,
		authFile.Name,
		authFile.ID,
		authFile.index(),
	} {
		if trimmed := strings.TrimSpace(candidate); trimmed != "" {
			return trimmed
		}
	}

	return "Codex"
}

func (authFile *cliproxyAuthFile) codexAccountID() string {
	for _, candidate := range []string{
		cliproxyStringValueFromAny(authFile.IDToken, "chatgpt_account_id", "chatgptAccountId"),
		cliproxyStringValueFromAny(authFile.IDToken, "account_id", "accountId"),
		cliproxyStringValueFromAny(authFile.Metadata, "chatgpt_account_id", "chatgptAccountId"),
		cliproxyStringValueFromAny(authFile.Attributes, "chatgpt_account_id", "chatgptAccountId"),
		cliproxyCodexValueFromJWT(authFile.IDToken, "chatgpt_account_id", "chatgptAccountId"),
		cliproxyCodexValueFromJWT(authFile.Metadata["id_token"], "chatgpt_account_id", "chatgptAccountId"),
		cliproxyCodexValueFromJWT(authFile.Attributes["id_token"], "chatgpt_account_id", "chatgptAccountId"),
	} {
		if strings.TrimSpace(candidate) != "" {
			return strings.TrimSpace(candidate)
		}
	}

	return ""
}

func (authFile *cliproxyAuthFile) planType() string {
	for _, candidate := range []string{
		cliproxyStringValueFromAny(authFile.IDToken, "plan_type", "planType", "chatgpt_plan_type", "chatgptPlanType"),
		cliproxyStringValueFromAny(authFile.Metadata, "plan_type", "planType", "chatgpt_plan_type", "chatgptPlanType"),
		cliproxyStringValueFromAny(authFile.Attributes, "plan_type", "planType", "chatgpt_plan_type", "chatgptPlanType"),
		cliproxyCodexValueFromJWT(authFile.IDToken, "chatgpt_plan_type", "chatgptPlanType", "plan_type", "planType"),
		cliproxyCodexValueFromJWT(authFile.Metadata["id_token"], "chatgpt_plan_type", "chatgptPlanType", "plan_type", "planType"),
		cliproxyCodexValueFromJWT(authFile.Attributes["id_token"], "chatgpt_plan_type", "chatgptPlanType", "plan_type", "planType"),
	} {
		if strings.TrimSpace(candidate) != "" {
			return strings.TrimSpace(candidate)
		}
	}

	return ""
}

func (account sub2APIAccount) isOpenAICodexAccount() bool {
	if !strings.EqualFold(strings.TrimSpace(account.Platform), "openai") {
		return false
	}

	switch strings.ToLower(strings.TrimSpace(account.Type)) {
	case "", "oauth", "setup-token":
	default:
		return false
	}

	switch strings.ToLower(strings.TrimSpace(account.Status)) {
	case "", "active", "error":
		return true
	default:
		return false
	}
}

func (account sub2APIAccount) displayName() string {
	if strings.TrimSpace(account.Name) != "" {
		return strings.TrimSpace(account.Name)
	}
	if account.ID != 0 {
		return strconv.FormatInt(account.ID, 10)
	}
	return "OpenAI"
}

func (account sub2APIAccount) displayPlan() string {
	if strings.TrimSpace(account.Type) != "" {
		return strings.TrimSpace(account.Type)
	}
	return "OpenAI"
}

func sub2APIUsagePlan(usage sub2APIUsageInfo) string {
	for _, candidate := range []string{
		formatCliproxyCodexPlan(usage.SubscriptionTier),
		formatCliproxyCodexPlan(usage.SubscriptionTierRaw),
	} {
		if strings.TrimSpace(candidate) != "" {
			return strings.TrimSpace(candidate)
		}
	}

	return ""
}

func parseCliproxyCodexQuotaWindows(usage map[string]any) []cliproxyQuotaWindow {
	windows := make([]cliproxyQuotaWindow, 0, 6)

	rateLimit := cliproxyMapValue(usage, "rate_limit", "rateLimit")
	fiveHour, weekly := cliproxyCodexPrimaryAndWeeklyWindows(rateLimit)
	windows = appendCliproxyQuotaWindow(windows, "five-hour", "5-hour limit", fiveHour, rateLimit)
	windows = appendCliproxyQuotaWindow(windows, "weekly", "Weekly limit", weekly, rateLimit)

	codeReviewRateLimit := cliproxyMapValue(usage, "code_review_rate_limit", "codeReviewRateLimit")
	codeReviewFiveHour, codeReviewWeekly := cliproxyCodexPrimaryAndWeeklyWindows(codeReviewRateLimit)
	windows = appendCliproxyQuotaWindow(windows, "code-review-five-hour", "Code review 5-hour limit", codeReviewFiveHour, codeReviewRateLimit)
	windows = appendCliproxyQuotaWindow(windows, "code-review-weekly", "Code review weekly limit", codeReviewWeekly, codeReviewRateLimit)

	for index, additional := range cliproxySliceValue(usage, "additional_rate_limits", "additionalRateLimits") {
		additionalMap := cliproxyMapFromAny(additional)
		if additionalMap == nil {
			continue
		}

		additionalRateLimit := cliproxyMapValue(additionalMap, "rate_limit", "rateLimit")
		if additionalRateLimit == nil {
			continue
		}

		name := cliproxyStringValueFromMap(additionalMap, "limit_name", "limitName", "metered_feature", "meteredFeature")
		if name == "" {
			name = fmt.Sprintf("Additional %d", index+1)
		}

		slug := cliproxySlug(name)
		if slug == "" {
			slug = fmt.Sprintf("additional-%d", index+1)
		}

		primaryWindow := cliproxyMapValue(additionalRateLimit, "primary_window", "primaryWindow")
		secondaryWindow := cliproxyMapValue(additionalRateLimit, "secondary_window", "secondaryWindow")
		windows = appendCliproxyQuotaWindow(windows, slug+"-primary", name+" 5-hour limit", primaryWindow, additionalRateLimit)
		windows = appendCliproxyQuotaWindow(windows, slug+"-secondary", name+" weekly limit", secondaryWindow, additionalRateLimit)
	}

	return windows
}

func parseSub2APIQuotaWindows(usage sub2APIUsageInfo, account sub2APIAccount) []cliproxyQuotaWindow {
	windows := make([]cliproxyQuotaWindow, 0, 6)
	windows = appendSub2APIUsageWindow(windows, "five-hour", "5-hour limit", usage.FiveHour)
	windows = appendSub2APIUsageWindow(windows, "weekly", "Weekly limit", usage.SevenDay)
	windows = appendSub2APIUsageWindow(windows, "weekly-sonnet", "Weekly Sonnet limit", usage.SevenDaySonnet)
	windows = appendSub2APIQuotaWindow(windows, "total-quota", "Total quota", account.QuotaLimit, account.QuotaUsed, "")
	windows = appendSub2APIQuotaWindow(windows, "daily-quota", "Daily quota", account.QuotaDailyLimit, account.QuotaDailyUsed, account.QuotaDailyResetAt)
	windows = appendSub2APIQuotaWindow(windows, "weekly-quota", "Weekly quota", account.QuotaWeeklyLimit, account.QuotaWeeklyUsed, account.QuotaWeeklyResetAt)
	return windows
}

func appendSub2APIUsageWindow(windows []cliproxyQuotaWindow, id, label string, progress *sub2APIUsageProgress) []cliproxyQuotaWindow {
	if progress == nil {
		return windows
	}

	resetAt := sub2APIResetAt(progress.ResetsAt, progress.RemainingSeconds)
	return append(windows, cliproxyQuotaWindow{
		ID:               id,
		Label:            label,
		RemainingPercent: sub2APIRemainingPercentFromUsed(progress.Utilization),
		ResetLabel:       formatCliproxyQuotaResetTime(resetAt),
		ResetAt:          resetAt,
	})
}

func appendSub2APIQuotaWindow(windows []cliproxyQuotaWindow, id, label string, limit, used float64, resetAtValue string) []cliproxyQuotaWindow {
	if limit <= 0 {
		return windows
	}

	usedPercent := (used / limit) * 100
	resetAt := sub2APIResetAt(resetAtValue, 0)
	return append(windows, cliproxyQuotaWindow{
		ID:               id,
		Label:            label,
		RemainingPercent: sub2APIRemainingPercentFromUsed(usedPercent),
		ResetLabel:       formatCliproxyQuotaResetTime(resetAt),
		ResetAt:          resetAt,
	})
}

func sub2APIResetAt(resetAt string, remainingSeconds int) *time.Time {
	if strings.TrimSpace(resetAt) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(resetAt))
		if err == nil {
			return &parsed
		}
	}

	if remainingSeconds > 0 {
		t := time.Now().Add(time.Duration(remainingSeconds) * time.Second)
		return &t
	}

	return nil
}

func sub2APIRemainingPercentFromUsed(usedPercent float64) *float64 {
	remaining := 100 - usedPercent
	remaining = math.Max(0, math.Min(100, remaining))
	return &remaining
}

func cliproxyCodexPrimaryAndWeeklyWindows(rateLimit map[string]any) (map[string]any, map[string]any) {
	if rateLimit == nil {
		return nil, nil
	}

	type candidate struct {
		name   string
		window map[string]any
	}

	candidates := []candidate{
		{name: "primary", window: cliproxyMapValue(rateLimit, "primary_window", "primaryWindow")},
		{name: "secondary", window: cliproxyMapValue(rateLimit, "secondary_window", "secondaryWindow")},
	}

	var fiveHour candidate
	var weekly candidate

	for _, candidate := range candidates {
		seconds, ok := cliproxyFloatValue(candidate.window, "limit_window_seconds", "limitWindowSeconds")
		if !ok {
			continue
		}
		switch int(seconds) {
		case 18000:
			if fiveHour.window == nil {
				fiveHour = candidate
			}
		case 604800:
			if weekly.window == nil {
				weekly = candidate
			}
		}
	}

	if fiveHour.window == nil && candidates[0].window != nil && weekly.name != "primary" {
		fiveHour = candidates[0]
	}
	if weekly.window == nil && candidates[1].window != nil && fiveHour.name != "secondary" {
		weekly = candidates[1]
	}

	return fiveHour.window, weekly.window
}

func appendCliproxyQuotaWindow(windows []cliproxyQuotaWindow, id, label string, window map[string]any, rateLimit map[string]any) []cliproxyQuotaWindow {
	if window == nil {
		return windows
	}

	resetAt := cliproxyQuotaResetAt(window)
	resetLabel := formatCliproxyQuotaResetTime(resetAt)
	remainingPercent := cliproxyRemainingPercent(window, rateLimit, resetLabel)

	return append(windows, cliproxyQuotaWindow{
		ID:               id,
		Label:            label,
		RemainingPercent: remainingPercent,
		ResetLabel:       resetLabel,
		ResetAt:          resetAt,
	})
}

func aggregateCliproxyQuotaWindows(accounts []cliproxyQuotaAccount) []cliproxyQuotaWindow {
	type aggregate struct {
		label      string
		sum        float64
		count      int
		resetAt    *time.Time
		resetLabel string
	}

	aggregates := make(map[string]*aggregate)
	order := make([]string, 0)

	for _, account := range accounts {
		for _, window := range account.Windows {
			id := strings.TrimSpace(window.ID)
			if id == "" {
				continue
			}

			windowAggregate := aggregates[id]
			if windowAggregate == nil {
				windowAggregate = &aggregate{
					label:      window.Label,
					resetLabel: "-",
				}
				aggregates[id] = windowAggregate
				order = append(order, id)
			}

			if windowAggregate.label == "" {
				windowAggregate.label = window.Label
			}

			if window.RemainingPercent != nil {
				windowAggregate.sum += math.Max(0, math.Min(100, *window.RemainingPercent))
				windowAggregate.count++
			}

			if window.ResetAt != nil {
				resetAt := *window.ResetAt
				if windowAggregate.resetAt == nil || resetAt.Before(*windowAggregate.resetAt) {
					windowAggregate.resetAt = &resetAt
				}
			} else if windowAggregate.resetLabel == "-" && strings.TrimSpace(window.ResetLabel) != "" {
				windowAggregate.resetLabel = window.ResetLabel
			}
		}
	}

	windows := make([]cliproxyQuotaWindow, 0, len(order))
	for _, id := range order {
		windowAggregate := aggregates[id]
		if windowAggregate == nil {
			continue
		}

		var remainingPercent *float64
		if windowAggregate.count > 0 {
			remaining := windowAggregate.sum / float64(windowAggregate.count)
			remainingPercent = &remaining
		}

		resetLabel := windowAggregate.resetLabel
		if windowAggregate.resetAt != nil {
			resetLabel = formatCliproxyQuotaResetTime(windowAggregate.resetAt)
		}

		windows = append(windows, cliproxyQuotaWindow{
			ID:               id,
			Label:            windowAggregate.label,
			RemainingPercent: remainingPercent,
			ResetLabel:       resetLabel,
			ResetAt:          windowAggregate.resetAt,
		})
	}

	return windows
}

func cliproxyRemainingPercent(window map[string]any, rateLimit map[string]any, resetLabel string) *float64 {
	usedPercent, ok := cliproxyFloatValue(window, "used_percent", "usedPercent")
	if !ok {
		limitReached, _ := cliproxyBoolValue(rateLimit, "limit_reached", "limitReached")
		allowed, allowedExists := cliproxyBoolValue(rateLimit, "allowed")
		if resetLabel == "-" || (!limitReached && (!allowedExists || allowed)) {
			return nil
		}
		usedPercent = 100
	}

	remaining := 100 - usedPercent
	remaining = math.Max(0, math.Min(100, remaining))

	return &remaining
}

func formatCliproxyQuotaReset(window map[string]any) string {
	return formatCliproxyQuotaResetTime(cliproxyQuotaResetAt(window))
}

func cliproxyQuotaResetAt(window map[string]any) *time.Time {
	if window == nil {
		return nil
	}

	if resetAt, ok := cliproxyFloatValue(window, "reset_at", "resetAt"); ok && resetAt > 0 {
		t := time.Unix(int64(resetAt), 0)
		return &t
	}

	if resetAfter, ok := cliproxyFloatValue(window, "reset_after_seconds", "resetAfterSeconds"); ok && resetAfter > 0 {
		t := time.Now().Add(time.Duration(resetAfter) * time.Second)
		return &t
	}

	return nil
}

func formatCliproxyQuotaResetTime(resetAt *time.Time) string {
	if resetAt == nil {
		return "-"
	}

	return resetAt.Format("01-02 15:04")
}

func (window cliproxyQuotaWindow) PercentLabel() string {
	if window.RemainingPercent == nil {
		return "--"
	}

	return fmt.Sprintf("%.0f%%", *window.RemainingPercent)
}

func (window cliproxyQuotaWindow) ResetTimestamp() string {
	if window.ResetAt == nil {
		return ""
	}

	return strconv.FormatInt(window.ResetAt.Unix(), 10)
}

func (window cliproxyQuotaWindow) ProgressValue() int {
	if window.RemainingPercent == nil {
		return 0
	}

	return int(math.Round(math.Max(0, math.Min(100, *window.RemainingPercent))))
}

func (window cliproxyQuotaWindow) ProgressClass() string {
	if window.RemainingPercent == nil {
		return "cliproxy-quota-progress-unknown"
	}

	switch {
	case *window.RemainingPercent < 20:
		return "cliproxy-quota-progress-low"
	case *window.RemainingPercent < 50:
		return "cliproxy-quota-progress-medium"
	default:
		return "cliproxy-quota-progress-high"
	}
}

func formatCliproxyCodexPlan(planType string) string {
	normalized := strings.ToLower(strings.TrimSpace(planType))
	if normalized == "" {
		return ""
	}

	switch strings.ReplaceAll(strings.ReplaceAll(normalized, "_", "-"), " ", "-") {
	case "plus":
		return "Plus"
	case "team":
		return "Team"
	case "free":
		return "Free"
	case "pro":
		return "Pro 20x"
	case "prolite", "pro-lite":
		return "Pro 5x"
	default:
		return planType
	}
}

func cliproxyMapValue(object map[string]any, keys ...string) map[string]any {
	if object == nil {
		return nil
	}

	for _, key := range keys {
		if value, exists := object[key]; exists {
			if mapped := cliproxyMapFromAny(value); mapped != nil {
				return mapped
			}
		}
	}

	return nil
}

func cliproxySliceValue(object map[string]any, keys ...string) []any {
	if object == nil {
		return nil
	}

	for _, key := range keys {
		value, exists := object[key]
		if !exists {
			continue
		}
		switch typed := value.(type) {
		case []any:
			return typed
		case []map[string]any:
			result := make([]any, len(typed))
			for i := range typed {
				result[i] = typed[i]
			}
			return result
		}
	}

	return nil
}

func cliproxyMapFromAny(value any) map[string]any {
	switch typed := value.(type) {
	case map[string]any:
		return typed
	case map[string]string:
		result := make(map[string]any, len(typed))
		for key, value := range typed {
			result[key] = value
		}
		return result
	default:
		return nil
	}
}

func cliproxyStringValueFromMap(object map[string]any, keys ...string) string {
	return cliproxyStringValueFromAny(object, keys...)
}

func cliproxyStringValueFromAny(value any, keys ...string) string {
	if value == nil {
		return ""
	}

	object := cliproxyMapFromAny(value)
	if object == nil {
		if len(keys) > 0 {
			return ""
		}
		return cliproxyScalarString(value)
	}

	for _, key := range keys {
		if value, exists := object[key]; exists {
			if scalar := cliproxyScalarString(value); scalar != "" {
				return scalar
			}
		}
	}

	if authInfo := cliproxyMapValue(object, "https://api.openai.com/auth"); authInfo != nil {
		for _, key := range keys {
			if value, exists := authInfo[key]; exists {
				if scalar := cliproxyScalarString(value); scalar != "" {
					return scalar
				}
			}
		}
	}

	return ""
}

func cliproxyCodexValueFromJWT(value any, keys ...string) string {
	token := cliproxyScalarString(value)
	if token == "" {
		return ""
	}

	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		switch len(parts[1]) % 4 {
		case 2:
			payload, err = base64.URLEncoding.DecodeString(parts[1] + "==")
		case 3:
			payload, err = base64.URLEncoding.DecodeString(parts[1] + "=")
		default:
			payload, err = base64.URLEncoding.DecodeString(parts[1])
		}
	}
	if err != nil {
		return ""
	}

	var claims map[string]any
	if err = json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	return cliproxyStringValueFromAny(claims, keys...)
}

func cliproxyScalarString(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case json.Number:
		return strings.TrimSpace(typed.String())
	case int:
		return strconv.Itoa(typed)
	case int64:
		return strconv.FormatInt(typed, 10)
	case float64:
		if math.Trunc(typed) == typed {
			return strconv.FormatInt(int64(typed), 10)
		}
		return strconv.FormatFloat(typed, 'f', -1, 64)
	default:
		return ""
	}
}

func cliproxyFloatValue(object map[string]any, keys ...string) (float64, bool) {
	if object == nil {
		return 0, false
	}

	for _, key := range keys {
		value, exists := object[key]
		if !exists {
			continue
		}

		switch typed := value.(type) {
		case float64:
			return typed, true
		case float32:
			return float64(typed), true
		case int:
			return float64(typed), true
		case int64:
			return float64(typed), true
		case json.Number:
			parsed, err := typed.Float64()
			if err == nil {
				return parsed, true
			}
		case string:
			trimmed := strings.TrimSpace(strings.TrimSuffix(typed, "%"))
			if trimmed == "" {
				continue
			}
			parsed, err := strconv.ParseFloat(trimmed, 64)
			if err == nil {
				return parsed, true
			}
		}
	}

	return 0, false
}

func cliproxyBoolValue(object map[string]any, keys ...string) (bool, bool) {
	if object == nil {
		return false, false
	}

	for _, key := range keys {
		value, exists := object[key]
		if !exists {
			continue
		}

		switch typed := value.(type) {
		case bool:
			return typed, true
		case string:
			parsed, err := strconv.ParseBool(strings.TrimSpace(typed))
			if err == nil {
				return parsed, true
			}
		case float64:
			return typed != 0, true
		case int:
			return typed != 0, true
		}
	}

	return false, false
}

func cliproxySlug(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}

	var builder strings.Builder
	previousDash := false
	for _, r := range value {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			builder.WriteRune(r)
			previousDash = false
			continue
		}

		if !previousDash && builder.Len() > 0 {
			builder.WriteRune('-')
			previousDash = true
		}
	}

	return strings.Trim(builder.String(), "-")
}
