# Sub2API Codex Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `cliproxy-quota` so it can read Codex/OpenAI upstream account pool usage from Sub2API admin APIs while preserving existing CLIProxy behavior.

**Architecture:** Keep one widget and one template. Add a `provider` switch in `cliproxyQuotaWidget`; `cliproxy` keeps the existing management API flow, while `sub2api` fetches `/api/v1/admin/accounts` and per-account `/usage` data, then maps it into the existing `cliproxyQuotaAccount` and `cliproxyQuotaWindow` structures.

**Tech Stack:** Go, `net/http`, YAML config parsing, existing Glance widget templates/CSS/JS, Go unit tests.

---

## File Structure

- Modify `internal/glance/widget-cliproxy-quota.go`: provider config, Sub2API DTOs, request decoding, account filtering, usage and quota mapping.
- Modify `internal/glance/widget-cliproxy-quota_test.go`: tests for Sub2API provider initialization, API calls, filtering, usage mapping, quota mapping, and per-account errors.
- Modify `docs/configuration.md`: document `provider` and add Sub2API configuration example.

## Task 1: Provider Selection And Sub2API Account Fetch Test

**Files:**
- Modify: `internal/glance/widget-cliproxy-quota_test.go`
- Modify: `internal/glance/widget-cliproxy-quota.go`

- [ ] **Step 1: Write the failing test**

Add this test after `TestCliproxyQuotaWidgetFetchesCodexQuota`:

```go
func TestCliproxyQuotaWidgetFetchesSub2APIOpenAIAccounts(t *testing.T) {
	usageCalls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "secret" {
			t.Errorf("unexpected x-api-key header: %q", r.Header.Get("x-api-key"))
		}
		if r.Header.Get("Authorization") != "" {
			t.Errorf("did not expect Authorization header for Sub2API, got %q", r.Header.Get("Authorization"))
		}

		switch r.URL.Path {
		case "/api/v1/admin/accounts":
			if r.URL.Query().Get("platform") != "openai" {
				t.Fatalf("expected platform=openai, got %q", r.URL.Query().Get("platform"))
			}
			writeJSON(t, w, map[string]any{
				"code":    0,
				"message": "success",
				"data": map[string]any{
					"items": []map[string]any{
						{"id": 7, "name": "OpenAI One", "platform": "openai", "type": "oauth", "status": "active"},
						{"id": 8, "name": "Claude", "platform": "anthropic", "type": "oauth", "status": "active"},
					},
					"total":     2,
					"page":      1,
					"page_size": 1000,
				},
			})
		case "/api/v1/admin/accounts/7/usage":
			usageCalls++
			if r.URL.Query().Get("source") != "active" {
				t.Fatalf("expected source=active, got %q", r.URL.Query().Get("source"))
			}
			writeJSON(t, w, map[string]any{
				"code":    0,
				"message": "success",
				"data": map[string]any{
					"five_hour": map[string]any{
						"utilization": 30,
						"resets_at":   "2030-01-01T00:00:00Z",
					},
				},
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	widget := newTestSub2APIQuotaWidget(t, server.URL)
	widget.update(context.Background())

	if widget.Error != nil {
		t.Fatalf("unexpected widget error: %v", widget.Error)
	}
	if usageCalls != 1 {
		t.Fatalf("expected 1 usage call, got %d", usageCalls)
	}
	if len(widget.Accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(widget.Accounts))
	}
	if widget.Accounts[0].Name != "OpenAI One" {
		t.Fatalf("expected OpenAI One account, got %q", widget.Accounts[0].Name)
	}
	if len(widget.Accounts[0].Windows) != 1 || widget.Accounts[0].Windows[0].PercentLabel() != "70%" {
		t.Fatalf("unexpected windows: %#v", widget.Accounts[0].Windows)
	}
}
```

Add this helper near `newTestCliproxyQuotaWidget`:

```go
func newTestSub2APIQuotaWidget(t *testing.T, url string) *cliproxyQuotaWidget {
	t.Helper()

	widget := &cliproxyQuotaWidget{
		Provider:      "sub2api",
		URL:           url,
		ManagementKey: "secret",
		Timeout:       durationField(time.Second),
	}
	if err := widget.initialize(); err != nil {
		t.Fatalf("initialize widget: %v", err)
	}

	return widget
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/glance -run TestCliproxyQuotaWidgetFetchesSub2APIOpenAIAccounts -count=1`

Expected: fail because `Provider` does not exist or Sub2API paths are not implemented.

- [ ] **Step 3: Implement provider routing and account fetch**

In `internal/glance/widget-cliproxy-quota.go`, add provider constants:

```go
const (
	cliproxyQuotaProviderCLIProxy = "cliproxy"
	cliproxyQuotaProviderSub2API  = "sub2api"
)
```

Add the field:

```go
Provider string `yaml:"provider"`
```

Normalize and validate in `initialize`:

```go
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
```

Choose the API base URL in `initialize`:

```go
managementAPIURL := strings.TrimRight(parsedURL.String(), "/")
if widget.Provider == cliproxyQuotaProviderCLIProxy && !strings.HasSuffix(managementAPIURL, "/v0/management") {
	managementAPIURL += "/v0/management"
}
if widget.Provider == cliproxyQuotaProviderSub2API && !strings.HasSuffix(managementAPIURL, "/api/v1/admin") {
	managementAPIURL += "/api/v1/admin"
}
```

Route `fetchCodexQuota`:

```go
func (widget *cliproxyQuotaWidget) fetchCodexQuota(ctx context.Context) ([]cliproxyQuotaAccount, error) {
	if widget.Provider == cliproxyQuotaProviderSub2API {
		return widget.fetchSub2APICodexQuota(ctx)
	}
	return widget.fetchCLIProxyCodexQuota(ctx)
}
```

Rename the current `fetchCodexQuota` body to `fetchCLIProxyCodexQuota`.

Add minimal Sub2API structs and fetcher:

```go
type sub2APIAccountsResponse struct {
	Items []sub2APIAccount `json:"items"`
}

type sub2APIAccount struct {
	ID           int64   `json:"id"`
	Name         string  `json:"name"`
	Platform     string  `json:"platform"`
	Type         string  `json:"type"`
	Status       string  `json:"status"`
	ErrorMessage string  `json:"error_message"`
	QuotaLimit   float64 `json:"quota_limit"`
	QuotaUsed    float64 `json:"quota_used"`
}

type sub2APIUsageInfo struct {
	FiveHour *sub2APIUsageProgress `json:"five_hour"`
}

type sub2APIUsageProgress struct {
	Utilization float64 `json:"utilization"`
	ResetsAt    string  `json:"resets_at"`
}
```

Implement `fetchSub2APICodexQuota`, `fetchSub2APIAccounts`, `fetchSub2APIUsage`, and Sub2API JSON decoding so the test passes.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/glance -run TestCliproxyQuotaWidgetFetchesSub2APIOpenAIAccounts -count=1`

Expected: pass.

## Task 2: Sub2API Usage And Quota Mapping

**Files:**
- Modify: `internal/glance/widget-cliproxy-quota_test.go`
- Modify: `internal/glance/widget-cliproxy-quota.go`

- [ ] **Step 1: Write the failing tests**

Add tests:

```go
func TestSub2APIUsageMapsAllCodexWindows(t *testing.T) {
	resetAt := "2030-01-01T00:00:00Z"
	usage := sub2APIUsageInfo{
		FiveHour:       &sub2APIUsageProgress{Utilization: 20, ResetsAt: resetAt},
		SevenDay:       &sub2APIUsageProgress{Utilization: 40, ResetsAt: resetAt},
		SevenDaySonnet: &sub2APIUsageProgress{Utilization: 55, ResetsAt: resetAt},
	}

	windows := parseSub2APIQuotaWindows(usage, sub2APIAccount{})

	assertWindow := func(id, percent string) {
		t.Helper()
		for _, window := range windows {
			if window.ID == id {
				if window.PercentLabel() != percent {
					t.Fatalf("expected %s to be %s, got %s", id, percent, window.PercentLabel())
				}
				if window.ResetTimestamp() == "" {
					t.Fatalf("expected %s to have reset timestamp", id)
				}
				return
			}
		}
		t.Fatalf("missing window %s in %#v", id, windows)
	}

	assertWindow("five-hour", "80%")
	assertWindow("weekly", "60%")
	assertWindow("weekly-sonnet", "45%")
}

func TestSub2APIAccountQuotaFieldsMapToWindows(t *testing.T) {
	account := sub2APIAccount{
		QuotaLimit:      100,
		QuotaUsed:       25,
		QuotaDailyLimit: 10,
		QuotaDailyUsed:  8,
		QuotaWeeklyLimit: 50,
		QuotaWeeklyUsed:  10,
	}

	windows := parseSub2APIQuotaWindows(sub2APIUsageInfo{}, account)

	assertWindow := func(id, percent string) {
		t.Helper()
		for _, window := range windows {
			if window.ID == id {
				if window.PercentLabel() != percent {
					t.Fatalf("expected %s to be %s, got %s", id, percent, window.PercentLabel())
				}
				return
			}
		}
		t.Fatalf("missing window %s in %#v", id, windows)
	}

	assertWindow("total-quota", "75%")
	assertWindow("daily-quota", "20%")
	assertWindow("weekly-quota", "80%")
}
```

Update `sub2APIUsageInfo` and `sub2APIAccount` definitions in tests by using production types directly.

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/glance -run 'TestSub2API(UsageMapsAllCodexWindows|AccountQuotaFieldsMapToWindows)' -count=1`

Expected: fail because the extra fields and mapping are not implemented.

- [ ] **Step 3: Implement full mapping**

Expand types:

```go
type sub2APIUsageInfo struct {
	FiveHour       *sub2APIUsageProgress `json:"five_hour"`
	SevenDay       *sub2APIUsageProgress `json:"seven_day"`
	SevenDaySonnet *sub2APIUsageProgress `json:"seven_day_sonnet"`

	SubscriptionTier    string `json:"subscription_tier"`
	SubscriptionTierRaw string `json:"subscription_tier_raw"`
	Error               string `json:"error"`
}

type sub2APIUsageProgress struct {
	Utilization      float64    `json:"utilization"`
	ResetsAt         string     `json:"resets_at"`
	RemainingSeconds int        `json:"remaining_seconds"`
	WindowStats      any        `json:"window_stats"`
	UsedRequests     int64      `json:"used_requests"`
	LimitRequests    int64      `json:"limit_requests"`
	UpdatedAt         *time.Time `json:"-"`
}
```

Expand `sub2APIAccount` with:

```go
QuotaDailyLimit   float64 `json:"quota_daily_limit"`
QuotaDailyUsed    float64 `json:"quota_daily_used"`
QuotaWeeklyLimit  float64 `json:"quota_weekly_limit"`
QuotaWeeklyUsed   float64 `json:"quota_weekly_used"`
QuotaDailyResetAt string  `json:"quota_daily_reset_at"`
QuotaWeeklyResetAt string `json:"quota_weekly_reset_at"`
```

Implement:

```go
func parseSub2APIQuotaWindows(usage sub2APIUsageInfo, account sub2APIAccount) []cliproxyQuotaWindow
func appendSub2APIUsageWindow(windows []cliproxyQuotaWindow, id, label string, progress *sub2APIUsageProgress) []cliproxyQuotaWindow
func appendSub2APIQuotaWindow(windows []cliproxyQuotaWindow, id, label string, limit, used float64, resetAt string) []cliproxyQuotaWindow
func sub2APIResetAt(resetAt string, remainingSeconds int) *time.Time
func sub2APIRemainingPercentFromUsed(usedPercent float64) *float64
```

Rules:

- Remaining percent is `100 - used`, clamped to `0..100`.
- Quota window used percent is `(used / limit) * 100`.
- Limit values `<= 0` omit the quota window.
- Reset strings parse with `time.RFC3339`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./internal/glance -run 'TestSub2API(UsageMapsAllCodexWindows|AccountQuotaFieldsMapToWindows)' -count=1`

Expected: pass.

## Task 3: Error Handling, Filtering, And Config Parsing

**Files:**
- Modify: `internal/glance/widget-cliproxy-quota_test.go`
- Modify: `internal/glance/widget-cliproxy-quota.go`

- [ ] **Step 1: Write failing tests**

Add:

```go
func TestCliproxyQuotaWidgetKeepsSub2APIAccountUsageErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/admin/accounts":
			writeJSON(t, w, map[string]any{
				"code": 0,
				"data": map[string]any{
					"items": []map[string]any{
						{"id": 1, "name": "ok", "platform": "openai", "status": "active"},
						{"id": 2, "name": "fail", "platform": "openai", "status": "active"},
					},
				},
			})
		case "/api/v1/admin/accounts/1/usage":
			writeJSON(t, w, map[string]any{"code": 0, "data": map[string]any{"five_hour": map[string]any{"utilization": 10}}})
		case "/api/v1/admin/accounts/2/usage":
			writeJSON(t, w, map[string]any{"code": 500, "message": "usage failed"})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	widget := newTestSub2APIQuotaWidget(t, server.URL)
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
		t.Fatal("expected second account error")
	}
}

func TestCliproxyQuotaWidgetParsesSub2APIProviderConfig(t *testing.T) {
	config, err := newConfigFromYAML([]byte(`
pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: cliproxy-quota
            provider: sub2api
            url: https://sub2api.example.com
            management-key: secret
`))
	if err != nil {
		t.Fatalf("new config: %v", err)
	}

	quotaWidget := config.Pages[0].Columns[0].Widgets[0].(*cliproxyQuotaWidget)
	if quotaWidget.Provider != cliproxyQuotaProviderSub2API {
		t.Fatalf("expected sub2api provider, got %q", quotaWidget.Provider)
	}
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./internal/glance -run 'TestCliproxyQuotaWidget(KeepsSub2APIAccountUsageErrors|ParsesSub2APIProviderConfig)' -count=1`

Expected: fail until envelope error handling and config normalization are complete.

- [ ] **Step 3: Implement error handling and filtering**

Ensure Sub2API JSON helper:

- Treats `code != 0` as an error using `message`.
- Accepts envelope, paginated data, and direct arrays.
- Returns HTTP status errors with short body text.

Ensure `sub2APIAccount.isOpenAICodexAccount()`:

```go
func (account sub2APIAccount) isOpenAICodexAccount() bool {
	if !strings.EqualFold(strings.TrimSpace(account.Platform), "openai") {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(account.Status)) {
	case "", "active", "error":
		return true
	default:
		return false
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `go test ./internal/glance -run 'TestCliproxyQuotaWidget(KeepsSub2APIAccountUsageErrors|ParsesSub2APIProviderConfig)' -count=1`

Expected: pass.

## Task 4: Documentation

**Files:**
- Modify: `docs/configuration.md`

- [ ] **Step 1: Update docs**

In the `### CLIProxy Quota` section:

- Change the opening description to mention CLIProxyAPI or Sub2API.
- Add a Sub2API example.
- Add `provider` to the properties table.
- Explain that Sub2API mode reads upstream OpenAI/Codex account pool usage and not user/API key balances.

- [ ] **Step 2: Review docs locally**

Run: `sed -n '747,815p' docs/configuration.md`

Expected: the section documents both providers and keeps old CLIProxy config valid.

## Task 5: Full Verification

**Files:**
- Verify: `internal/glance/widget-cliproxy-quota.go`
- Verify: `internal/glance/widget-cliproxy-quota_test.go`
- Verify: `docs/configuration.md`

- [ ] **Step 1: Run focused tests**

Run: `go test ./internal/glance -run 'CliproxyQuota|Sub2API' -count=1`

Expected: pass.

- [ ] **Step 2: Run package tests**

Run: `go test ./internal/glance -count=1`

Expected: pass.

- [ ] **Step 3: Run formatting**

Run: `gofmt -w internal/glance/widget-cliproxy-quota.go internal/glance/widget-cliproxy-quota_test.go`

Expected: no output.

- [ ] **Step 4: Check working tree**

Run: `git status --short`

Expected: only intended files changed plus pre-existing untracked `tab-out-widget.yml`.

