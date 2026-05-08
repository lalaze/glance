package glance

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestParseCliproxyCodexQuotaWindows(t *testing.T) {
	var usage map[string]any
	if err := json.Unmarshal([]byte(`{
		"plan_type": "plus",
		"rate_limit": {
			"primary_window": {
				"limit_window_seconds": 18000,
				"used_percent": 25,
				"reset_at": 1893456000
			},
			"secondary_window": {
				"limit_window_seconds": 604800,
				"used_percent": 75,
				"reset_at": 1893456000
			}
		},
		"code_review_rate_limit": {
			"limit_reached": true,
			"primary_window": {
				"limit_window_seconds": 18000,
				"reset_at": 1893456000
			}
		},
		"additional_rate_limits": [
			{
				"limit_name": "GPT-5",
				"rate_limit": {
					"primary_window": {
						"used_percent": "10%",
						"reset_at": 1893456000
					},
					"secondary_window": {
						"used_percent": 50,
						"reset_at": 1893456000
					}
				}
			}
		]
	}`), &usage); err != nil {
		t.Fatalf("unmarshal usage: %v", err)
	}

	windows := parseCliproxyCodexQuotaWindows(usage)
	if len(windows) != 5 {
		t.Fatalf("expected 5 windows, got %d: %#v", len(windows), windows)
	}

	assertWindow := func(id, percent string) {
		t.Helper()
		for _, window := range windows {
			if window.ID == id {
				if window.PercentLabel() != percent {
					t.Fatalf("expected %s to be %s, got %s", id, percent, window.PercentLabel())
				}
				if window.ResetLabel == "-" {
					t.Fatalf("expected %s to have a reset label", id)
				}
				return
			}
		}
		t.Fatalf("missing window %s", id)
	}

	assertWindow("five-hour", "75%")
	assertWindow("weekly", "25%")
	assertWindow("code-review-five-hour", "0%")
	assertWindow("gpt-5-primary", "90%")
	assertWindow("gpt-5-secondary", "50%")
}

func TestCliproxyQuotaWidgetTotalAccountAveragesAccountWindows(t *testing.T) {
	fiveHourFirst := 93.0
	fiveHourSecond := 91.0
	weeklyFirst := 67.0
	widget := &cliproxyQuotaWidget{
		Accounts: []cliproxyQuotaAccount{
			{
				Name: "first@example.com",
				Windows: []cliproxyQuotaWindow{
					{ID: "five-hour", Label: "5-hour limit", RemainingPercent: &fiveHourFirst, ResetLabel: "05-06 21:20"},
					{ID: "weekly", Label: "Weekly limit", RemainingPercent: &weeklyFirst, ResetLabel: "05-12 07:21"},
				},
			},
			{
				Name: "second@example.com",
				Windows: []cliproxyQuotaWindow{
					{ID: "five-hour", Label: "5-hour limit", RemainingPercent: &fiveHourSecond, ResetLabel: "05-06 21:13"},
					{ID: "weekly", Label: "Weekly limit", ResetLabel: "-"},
				},
			},
		},
	}

	total := widget.TotalAccount()
	if total == nil {
		t.Fatal("expected a total account")
	}
	if total.Name != "All accounts" {
		t.Fatalf("expected total account name, got %q", total.Name)
	}
	if total.Plan != "Total" {
		t.Fatalf("expected total account plan, got %q", total.Plan)
	}
	if len(total.Windows) != 2 {
		t.Fatalf("expected 2 total windows, got %d", len(total.Windows))
	}

	if total.Windows[0].ID != "five-hour" {
		t.Fatalf("expected first total window to keep account window order, got %q", total.Windows[0].ID)
	}
	if total.Windows[0].PercentLabel() != "92%" {
		t.Fatalf("expected averaged five-hour percent to be 92%%, got %s", total.Windows[0].PercentLabel())
	}
	if total.Windows[1].ID != "weekly" {
		t.Fatalf("expected second total window to be weekly, got %q", total.Windows[1].ID)
	}
	if total.Windows[1].PercentLabel() != "67%" {
		t.Fatalf("expected weekly percent to ignore unknown account values, got %s", total.Windows[1].PercentLabel())
	}
}

func TestCliproxyQuotaWidgetFetchesCodexQuota(t *testing.T) {
	apiCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			t.Errorf("unexpected Authorization header: %q", r.Header.Get("Authorization"))
		}

		switch r.URL.Path {
		case "/v0/management/auth-files":
			writeJSON(t, w, map[string]any{
				"files": []map[string]any{
					{
						"auth_index": "codex-1",
						"provider":   "codex",
						"name":       "codex.json",
						"label":      "Personal",
						"id_token": map[string]any{
							"chatgpt_account_id": "acct_1",
							"plan_type":          "plus",
						},
					},
					{
						"auth_index": "gemini-1",
						"provider":   "gemini-cli",
						"name":       "gemini.json",
					},
					{
						"auth_index": "codex-disabled",
						"provider":   "codex",
						"disabled":   true,
						"id_token": map[string]any{
							"chatgpt_account_id": "acct_disabled",
						},
					},
				},
			})
		case "/v0/management/api-call":
			apiCalls++
			var request cliproxyAPICallRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatalf("decode api-call body: %v", err)
			}
			if request.AuthIndex != "codex-1" {
				t.Fatalf("unexpected auth_index: %q", request.AuthIndex)
			}
			if request.URL != cliproxyCodexUsageURL {
				t.Fatalf("unexpected upstream url: %q", request.URL)
			}
			if request.Header["Authorization"] != "Bearer $TOKEN$" {
				t.Fatalf("unexpected upstream Authorization header: %q", request.Header["Authorization"])
			}
			if request.Header["Chatgpt-Account-Id"] != "acct_1" {
				t.Fatalf("unexpected Chatgpt-Account-Id: %q", request.Header["Chatgpt-Account-Id"])
			}

			writeJSON(t, w, cliproxyAPICallResponse{
				StatusCode: http.StatusOK,
				Body: `{
					"plan_type": "team",
					"rate_limit": {
						"primary_window": {
							"limit_window_seconds": 18000,
							"used_percent": 40,
							"reset_at": 1893456000
						}
					}
				}`,
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	widget := newTestCliproxyQuotaWidget(t, server.URL)
	widget.update(context.Background())

	if widget.Error != nil {
		t.Fatalf("unexpected widget error: %v", widget.Error)
	}
	if !widget.ContentAvailable {
		t.Fatal("expected content to be available")
	}
	if apiCalls != 1 {
		t.Fatalf("expected 1 api-call, got %d", apiCalls)
	}
	if len(widget.Accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(widget.Accounts))
	}

	account := widget.Accounts[0]
	if account.Name != "Personal" {
		t.Fatalf("expected account name Personal, got %q", account.Name)
	}
	if account.Plan != "Team" {
		t.Fatalf("expected usage plan to override auth plan as Team, got %q", account.Plan)
	}
	if account.Error != "" {
		t.Fatalf("unexpected account error: %s", account.Error)
	}
	if len(account.Windows) != 1 || account.Windows[0].PercentLabel() != "60%" {
		t.Fatalf("unexpected windows: %#v", account.Windows)
	}
}

func TestCliproxyQuotaWidgetNoCodexCredentials(t *testing.T) {
	apiCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v0/management/auth-files":
			writeJSON(t, w, map[string]any{
				"files": []map[string]any{
					{"auth_index": "gemini-1", "provider": "gemini-cli"},
					{"auth_index": "codex-disabled", "provider": "codex", "disabled": true},
				},
			})
		case "/v0/management/api-call":
			apiCalls++
			t.Fatal("api-call should not be requested when there are no active Codex credentials")
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	widget := newTestCliproxyQuotaWidget(t, server.URL)
	widget.update(context.Background())

	if widget.Error != nil {
		t.Fatalf("unexpected widget error: %v", widget.Error)
	}
	if len(widget.Accounts) != 0 {
		t.Fatalf("expected no accounts, got %d", len(widget.Accounts))
	}
	if apiCalls != 0 {
		t.Fatalf("expected no api calls, got %d", apiCalls)
	}
}

func TestCliproxyQuotaWidgetAuthFilesFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "denied", http.StatusUnauthorized)
	}))
	defer server.Close()

	widget := newTestCliproxyQuotaWidget(t, server.URL)
	widget.update(context.Background())

	if widget.Error == nil {
		t.Fatal("expected widget error")
	}
	if !strings.Contains(widget.Error.Error(), "401") {
		t.Fatalf("expected error to mention 401, got %v", widget.Error)
	}
}

func TestCliproxyQuotaWidgetKeepsPerAccountUsageErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v0/management/auth-files":
			writeJSON(t, w, map[string]any{
				"files": []map[string]any{
					{
						"auth_index": "codex-ok",
						"provider":   "codex",
						"id_token": map[string]any{
							"chatgpt_account_id": "acct_ok",
						},
					},
					{
						"auth_index": "codex-fail",
						"provider":   "codex",
						"id_token": map[string]any{
							"chatgpt_account_id": "acct_fail",
						},
					},
				},
			})
		case "/v0/management/api-call":
			var request cliproxyAPICallRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatalf("decode api-call body: %v", err)
			}
			if request.AuthIndex == "codex-fail" {
				writeJSON(t, w, cliproxyAPICallResponse{
					StatusCode: http.StatusUnauthorized,
					Body:       `{"error":"expired"}`,
				})
				return
			}

			writeJSON(t, w, cliproxyAPICallResponse{
				StatusCode: http.StatusOK,
				Body: `{
					"rate_limit": {
						"primary_window": {
							"limit_window_seconds": 18000,
							"used_percent": 20,
							"reset_at": 1893456000
						}
					}
				}`,
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	widget := newTestCliproxyQuotaWidget(t, server.URL)
	widget.update(context.Background())

	if widget.Error != nil {
		t.Fatalf("unexpected widget error: %v", widget.Error)
	}
	if len(widget.Accounts) != 2 {
		t.Fatalf("expected 2 accounts, got %d", len(widget.Accounts))
	}
	if widget.Accounts[0].Error != "" {
		t.Fatalf("unexpected first account error: %s", widget.Accounts[0].Error)
	}
	if widget.Accounts[1].Error == "" {
		t.Fatal("expected second account to keep its usage error")
	}
}

func TestCliproxyQuotaWidgetInitializeValidation(t *testing.T) {
	tests := []struct {
		name          string
		url           string
		managementKey string
	}{
		{name: "missing url", managementKey: "secret"},
		{name: "invalid url", url: "://bad", managementKey: "secret"},
		{name: "missing key", url: "https://cliproxy.example.com"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			widget := &cliproxyQuotaWidget{
				URL:           test.url,
				ManagementKey: test.managementKey,
			}
			if err := widget.initialize(); err == nil {
				t.Fatal("expected initialize error")
			}
		})
	}
}

func TestCliproxyQuotaWidgetRenderDisablesPollingByDefault(t *testing.T) {
	widget := &cliproxyQuotaWidget{}
	widget.setID(42)
	widget.ContentAvailable = true

	rendered := string(widget.Render())

	if !strings.Contains(rendered, `data-cliproxy-quota-widget`) {
		t.Fatalf("expected rendered widget to include the quota widget marker: %s", rendered)
	}
	if !strings.Contains(rendered, `data-widget-id="42"`) {
		t.Fatalf("expected rendered widget to include its widget ID: %s", rendered)
	}
	if strings.Contains(rendered, "data-poll-interval") {
		t.Fatalf("expected default render to omit polling interval: %s", rendered)
	}
}

func TestCliproxyQuotaWidgetRenderIncludesPollingIntervalWhenConfigured(t *testing.T) {
	widget := &cliproxyQuotaWidget{
		PollInterval: durationField(15 * time.Minute),
	}
	widget.setID(42)
	widget.ContentAvailable = true

	rendered := string(widget.Render())

	if !strings.Contains(rendered, `data-poll-interval="900000"`) {
		t.Fatalf("expected rendered widget to include 15m polling interval in milliseconds: %s", rendered)
	}
}

func TestCliproxyQuotaWidgetRenderIncludesRefreshButton(t *testing.T) {
	widget := &cliproxyQuotaWidget{}
	widget.setID(42)
	widget.ContentAvailable = true

	rendered := string(widget.Render())

	for _, expected := range []string{
		`data-cliproxy-quota-refresh-button`,
		`aria-label="Refresh Codex quota"`,
		`Refresh`,
	} {
		if !strings.Contains(rendered, expected) {
			t.Fatalf("expected rendered widget to contain %q: %s", expected, rendered)
		}
	}
}

func TestCliproxyQuotaWidgetRefreshEndpointForcesUpdate(t *testing.T) {
	apiCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v0/management/auth-files":
			writeJSON(t, w, map[string]any{
				"files": []map[string]any{
					{
						"auth_index": "codex-1",
						"provider":   "codex",
						"label":      "Personal",
						"id_token": map[string]any{
							"chatgpt_account_id": "acct_1",
						},
					},
				},
			})
		case "/v0/management/api-call":
			apiCalls++
			writeJSON(t, w, cliproxyAPICallResponse{
				StatusCode: http.StatusOK,
				Body: fmt.Sprintf(`{
					"rate_limit": {
						"primary_window": {
							"limit_window_seconds": 18000,
							"used_percent": %d,
							"reset_at": 1893456000
						}
					}
				}`, apiCalls*10),
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	config, err := newConfigFromYAML([]byte(fmt.Sprintf(`
pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: cliproxy-quota
            url: %q
            management-key: secret
`, server.URL)))
	if err != nil {
		t.Fatalf("new config: %v", err)
	}

	app, err := newApplication(config)
	if err != nil {
		t.Fatalf("new application: %v", err)
	}

	quotaWidget := app.Config.Pages[0].Columns[0].Widgets[0].(*cliproxyQuotaWidget)
	quotaWidget.update(context.Background())

	if apiCalls != 1 {
		t.Fatalf("expected initial update to make 1 api call, got %d", apiCalls)
	}
	if quotaWidget.Accounts[0].Windows[0].PercentLabel() != "90%" {
		t.Fatalf("expected initial remaining quota to be 90%%, got %s", quotaWidget.Accounts[0].Windows[0].PercentLabel())
	}

	widgetID := fmt.Sprint(quotaWidget.GetID())
	request := httptest.NewRequest(http.MethodPost, "/api/widgets/"+widgetID+"/refresh", nil)
	request.SetPathValue("widget", widgetID)
	request.SetPathValue("path", "refresh")
	recorder := httptest.NewRecorder()

	app.handleWidgetRequest(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected refresh to return 200, got %d: %s", recorder.Code, recorder.Body.String())
	}
	if apiCalls != 2 {
		t.Fatalf("expected manual refresh to force a second api call, got %d", apiCalls)
	}
	if quotaWidget.Accounts[0].Windows[0].PercentLabel() != "80%" {
		t.Fatalf("expected refreshed remaining quota to be 80%%, got %s", quotaWidget.Accounts[0].Windows[0].PercentLabel())
	}
	if !strings.Contains(recorder.Body.String(), `data-cliproxy-quota-widget`) {
		t.Fatalf("expected response to contain rendered quota widget: %s", recorder.Body.String())
	}
}

func TestCliproxyQuotaWidgetRenderIncludesResetTimestamp(t *testing.T) {
	remaining := 76.0
	resetAt := time.Unix(1893456000, 0)
	widget := &cliproxyQuotaWidget{
		Accounts: []cliproxyQuotaAccount{
			{
				Name: "user@example.com",
				Plan: "Plus",
				Windows: []cliproxyQuotaWindow{
					{
						ID:               "five-hour",
						Label:            "5-hour limit",
						RemainingPercent: &remaining,
						ResetLabel:       "01-01 00:00",
						ResetAt:          &resetAt,
					},
				},
			},
		},
	}
	widget.setID(42)
	widget.ContentAvailable = true

	rendered := string(widget.Render())

	if !strings.Contains(rendered, `data-cliproxy-quota-reset-at="1893456000"`) {
		t.Fatalf("expected rendered reset time to include unix timestamp: %s", rendered)
	}
}

func TestCliproxyQuotaWidgetRenderDefaultsToTotalViewForMultipleAccounts(t *testing.T) {
	fiveHourFirst := 93.0
	fiveHourSecond := 91.0
	widget := &cliproxyQuotaWidget{
		Accounts: []cliproxyQuotaAccount{
			{
				Name: "first@example.com",
				Plan: "Team",
				Windows: []cliproxyQuotaWindow{
					{ID: "five-hour", Label: "5-hour limit", RemainingPercent: &fiveHourFirst, ResetLabel: "05-06 21:20"},
				},
			},
			{
				Name: "second@example.com",
				Plan: "Team",
				Windows: []cliproxyQuotaWindow{
					{ID: "five-hour", Label: "5-hour limit", RemainingPercent: &fiveHourSecond, ResetLabel: "05-06 21:13"},
				},
			},
		},
	}
	widget.setID(42)
	widget.ContentAvailable = true

	rendered := string(widget.Render())

	for _, expected := range []string{
		`data-cliproxy-quota-view-option="total"`,
		`data-cliproxy-quota-view-option="accounts"`,
		`data-cliproxy-quota-view="total"`,
		`data-cliproxy-quota-view="accounts" hidden`,
		`All accounts`,
		`Total`,
		`first@example.com`,
		`second@example.com`,
	} {
		if !strings.Contains(rendered, expected) {
			t.Fatalf("expected rendered widget to contain %q: %s", expected, rendered)
		}
	}
}

func TestCliproxyAuthFileExtractsCodexClaimsFromJWT(t *testing.T) {
	token := testJWT(t, map[string]any{
		"email": "user@example.com",
		"https://api.openai.com/auth": map[string]any{
			"chatgpt_account_id": "acct_jwt",
			"chatgpt_plan_type":  "prolite",
		},
	})

	authFile := cliproxyAuthFile{
		Provider:  "codex",
		AuthIndex: "codex-jwt",
		IDToken:   token,
	}

	if accountID := authFile.codexAccountID(); accountID != "acct_jwt" {
		t.Fatalf("expected JWT account ID, got %q", accountID)
	}
	if plan := formatCliproxyCodexPlan(authFile.planType()); plan != "Pro 5x" {
		t.Fatalf("expected JWT plan Pro 5x, got %q", plan)
	}
}

func newTestCliproxyQuotaWidget(t *testing.T, url string) *cliproxyQuotaWidget {
	t.Helper()

	widget := &cliproxyQuotaWidget{
		URL:           url,
		ManagementKey: "secret",
		Timeout:       durationField(time.Second),
	}
	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize widget: %v", err)
	}

	return widget
}

func writeJSON(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Fatalf("write JSON: %v", err)
	}
}

func testJWT(t *testing.T, claims map[string]any) string {
	t.Helper()

	header, err := json.Marshal(map[string]string{"alg": "none"})
	if err != nil {
		t.Fatalf("marshal jwt header: %v", err)
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("marshal jwt payload: %v", err)
	}

	return base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload) + "."
}
