# Sub2API Codex Quota Compatibility Design

## Goal

Extend the existing `cliproxy-quota` widget so it can display Codex/OpenAI upstream account pool usage from a Sub2API admin instance.

This work only covers Sub2API administrator visibility into upstream OpenAI/Codex accounts. It does not display Sub2API user balances, user API key quota, payment balances, or non-OpenAI upstream platforms.

## Current Behavior

The `cliproxy-quota` widget currently supports CLIProxyAPI only:

- It requires `url` and `management-key`.
- It appends `/v0/management` to the configured URL.
- It fetches `/auth-files` to find active Codex OAuth credentials.
- It uses `/api-call` to call ChatGPT Codex usage on behalf of each credential.
- It renders a total view, per-account view, manual refresh, polling, and reset countdowns.

The existing UI and aggregation model are already a good fit for Codex quota windows, so the Sub2API support should reuse them.

## Proposed Configuration

Add an optional `provider` field to `cliproxy-quota`.

```yaml
- type: cliproxy-quota
  provider: sub2api
  title: Codex Quota
  url: https://sub2api.example.com
  management-key: ${SUB2API_ADMIN_API_KEY}
  cache: 15m
  poll-interval: 15m
  timeout: 20s
```

Rules:

- `provider` defaults to `cliproxy` for backward compatibility.
- `provider: cliproxy` preserves the existing API paths and Authorization header behavior.
- `provider: sub2api` uses Sub2API admin API paths and sends `x-api-key: <management-key>`.
- Invalid providers fail widget initialization with a clear error.

## Sub2API Data Flow

For Sub2API, the widget fetches OpenAI upstream accounts and then usage for each account:

1. Request account list:

   `GET /api/v1/admin/accounts?page=1&page_size=1000&platform=openai`

2. Decode either a Sub2API response envelope or a direct paginated object:

   - `{ "code": 0, "message": "success", "data": { "items": [...], ... } }`
   - `{ "items": [...], "total": ..., "page": ..., "page_size": ... }`
   - `[...]` as a tolerance fallback for testability and older forks

3. For each account that belongs to OpenAI/Codex, request active usage:

   `GET /api/v1/admin/accounts/:id/usage?source=active`

4. Decode the usage response from the same Sub2API envelope shape.

## Account Selection

The widget displays only Sub2API upstream accounts that are clearly OpenAI/Codex accounts:

- `platform` must be `openai` case-insensitively.
- Accounts marked inactive should be skipped.
- Accounts with an error status should still be rendered when they are part of the pool, with the error shown on the card.
- Non-OpenAI accounts are ignored.

The account card uses:

- Name: `name`, falling back to `id`.
- Plan: OpenAI subscription fields from usage when present, otherwise `type`, otherwise `OpenAI`.
- Error: account `error_message` and per-account usage errors.

## Quota Window Mapping

Sub2API `UsageInfo` windows map into the existing `cliproxyQuotaWindow` model:

- `five_hour` becomes `5-hour limit`.
- `seven_day` becomes `Weekly limit`.
- `seven_day_sonnet` becomes `Weekly Sonnet limit` if present.
- A progress utilization value is treated as percent used, so remaining percent is `100 - utilization`, clamped to `0..100`.
- `resets_at` becomes the reset time.
- `remaining_seconds` is used as a fallback reset time when `resets_at` is absent.

Sub2API account quota fields should also be displayed when present:

- `quota_limit` and `quota_used` become `Total quota`.
- `quota_daily_limit` and `quota_daily_used` become `Daily quota`.
- `quota_weekly_limit` and `quota_weekly_used` become `Weekly quota`.
- Reset fields such as `quota_daily_reset_at` and `quota_weekly_reset_at` are used when available.

Quota windows with no limit and no useful usage data are omitted.

## Error Handling

- Failure to fetch the Sub2API account list is a widget-level error.
- Failure to fetch usage for one account is an account-level error and does not block other accounts.
- Sub2API non-zero envelope `code` values are treated as errors using the envelope `message`.
- HTTP errors include the status code and a short response body.
- Existing CLIProxy error handling remains unchanged.

## Implementation Shape

Keep one widget type and add provider-specific fetchers:

- Add `Provider string` to `cliproxyQuotaWidget`.
- Keep existing CLIProxy functions intact.
- Add Sub2API account/usage DTOs in `widget-cliproxy-quota.go`.
- Route `fetchCodexQuota` based on provider.
- Add small helpers for Sub2API envelope decoding, percent conversion, reset parsing, and quota field mapping.

This keeps the UI, CSS, JavaScript, refresh endpoint, and aggregation logic unchanged.

## Tests

Add focused tests for:

- Default provider remains CLIProxy and existing tests continue to pass.
- `provider: sub2api` initializes and uses `/api/v1/admin/accounts`.
- Sub2API requests use `x-api-key`.
- Sub2API account list filters to OpenAI accounts.
- Sub2API usage windows map to existing quota cards.
- Account-level usage failures are preserved without failing the whole widget.
- Sub2API quota limit fields map to total/daily/weekly windows.
- Config parsing accepts `provider: sub2api`.

## Documentation

Update the CLIProxy Quota section in `docs/configuration.md`:

- Rename the description to mention CLIProxyAPI or Sub2API.
- Document `provider`.
- Add a Sub2API example.
- Clarify that Sub2API mode shows upstream OpenAI/Codex account pool usage, not user balances or user API key quota.

