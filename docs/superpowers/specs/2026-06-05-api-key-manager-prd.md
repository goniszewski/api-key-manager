# API Key Manager PRD

Date: 2026-06-05
Owner: goniszewski
Target repo: `goniszewski/api-key-manager`

## Summary

API Key Manager is a client-only web app for storing AI platform API keys locally, annotating them with tags and comments, and refreshing any metadata that providers expose through browser-callable APIs. The first version must run as a static site on GitHub Pages.

The app is not a hosted key vault. It stores encrypted key material in the user's browser and never sends keys to an application-owned backend. Provider APIs may still receive the key when the user explicitly refreshes metadata for that provider.

## Goals

- Let users add API keys for OpenAI, Anthropic, DeepSeek, Gemini, OpenRouter, and unknown/custom providers.
- Auto-detect likely provider from known key prefixes and let the user override the provider before saving.
- Store keys locally with encryption using a passphrase-derived key and WebCrypto.
- Show provider metadata when available, including balance, usage, limits, expiration, validity, last checked time, and provider-specific warnings.
- Let users refresh metadata globally, by tag, or per key.
- Let users add multiple tags and one comment per key.
- Provide a top-level Tags page that groups all keys under each tag.
- Provide an About page that explains client-only security tradeoffs and provider/API limitations.
- Be lightweight enough for GitHub Pages deployment.

## Non-Goals

- No hosted backend in the MVP.
- No cloud sync or user accounts.
- No shared team vault.
- No automatic background refresh while the app is closed.
- No guaranteed metadata for every provider.
- No revocation, key creation, or rotation in provider accounts.
- No storage of raw API keys in plain localStorage.

## Target Users

- Developers using multiple AI API providers.
- Indie hackers or small teams tracking balances and limits across keys.
- Users who want a local, browser-only inventory rather than a hosted secrets service.

## User Stories

- As a user, I can unlock my local vault with a passphrase.
- As a user, I can add a key and see the provider auto-detected when the prefix is known.
- As a user, I can manually choose or correct the provider before saving.
- As a user, I can add tags such as `prod`, `lab`, `routing`, or `watch`.
- As a user, I can add a comment describing where the key is used.
- As a user, I can see all saved keys in a table with provider, status, balance/limits, tags, comment, and last checked time.
- As a user, I can click an icon-only refresh button for one key.
- As a user, I can refresh metadata for all keys.
- As a user, I can open a tag page and refresh only keys under that tag.
- As a user, I can read the About page to understand what metadata is unavailable and why.

## Product Requirements

### Vault And Local Storage

- On first use, the app asks the user to create a passphrase.
- The passphrase derives an AES-GCM encryption key with PBKDF2.
- The encrypted vault is stored in IndexedDB.
- The passphrase is never stored.
- The app stores only encrypted API key values at rest.
- Non-secret display fields may be stored inside the encrypted vault for simplicity and consistency.
- The unlocked vault exists only in page memory until reload or lock.
- The user can lock the vault, clearing decrypted keys from memory.

### Key Record

Each key record contains:

- `id`: stable local ID.
- `label`: user-facing name.
- `provider`: selected provider enum or `unknown`.
- `providerDetection`: `{ provider, confidence, reason }`.
- `encryptedKey`: encrypted inside the vault payload.
- `maskedKey`: derived display value such as `sk-or-v1...abcd`.
- `tags`: string array, multiple tags allowed.
- `comment`: optional user comment.
- `metadata`: provider metadata snapshot.
- `lastCheckedAt`: ISO timestamp or `null`.
- `lastRefreshStatus`: `never`, `checking`, `ok`, `limited`, `manual`, or `error`.
- `lastRefreshError`: user-facing error string or `null`.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.

### Provider Detection

- Detection runs while the user enters a key.
- Detection returns one of:
  - `high`: provider-specific prefix or strong shape.
  - `medium`: likely provider but not uniquely identifiable.
  - `unknown`: no reliable match.
- Users can override the detected provider before save.
- Metadata refresh does not run for `unknown` provider keys until the user chooses a provider.

Initial detection rules:

- OpenRouter: `sk-or-v1-` => high confidence.
- Gemini: `AIza` Google API key shape => medium/high confidence for Gemini/Google key, user can confirm Gemini.
- Anthropic: known Anthropic key prefix when present => high confidence.
- OpenAI: OpenAI-like `sk-` or `sk-proj-` => medium confidence because other providers can use `sk-` style prefixes.
- DeepSeek: generic `sk-` style => low/medium confidence unless future provider-specific patterns are confirmed.
- Unknown/custom: fallback for everything else.

### Metadata Refresh

- The Keys page has a global icon-only refresh button with accessible label `Refresh metadata`.
- Every key row has an icon-only refresh button with accessible label containing the key label.
- Each tag detail page has an icon-only refresh button with accessible label `Refresh tag metadata`.
- Refresh actions update `metadata`, `lastCheckedAt`, `lastRefreshStatus`, and `lastRefreshError`.
- Refresh actions should run sequentially or with conservative concurrency to avoid provider rate limits.
- Refresh results should not erase previously successful metadata unless the provider response proves the value changed.

### Provider Metadata Matrix

| Provider | MVP metadata | Notes |
| --- | --- | --- |
| OpenRouter | Label, credit limit, remaining limit, all-time/daily/weekly/monthly usage, BYOK usage, free-tier flag, created/updated/expires if returned | OpenRouter exposes key details at `/api/v1/key` and management APIs can include expiration and limits. |
| DeepSeek | Account availability and balances by currency: total, granted, topped-up | DeepSeek exposes `/user/balance`; usage by key appears available through exported console CSV, not direct browser API. |
| OpenAI | Basic key validity via lightweight authenticated call when CORS allows; richer project key metadata and costs require Admin API key and org/project IDs | OpenAI documents admin/project APIs and usage/cost APIs, but normal API keys should not be exposed in client-side production apps. |
| Anthropic | Basic validity where possible; admin usage reports require Admin API and organization account | Anthropic Admin API is unavailable for individual accounts and uses admin keys. |
| Gemini | Basic API key shape and optional manual notes; billing and API key metadata generally live in AI Studio/Google Cloud | Google warns against client-side exposure for production and Cloud API Keys metadata requires OAuth/IAM, not just the API key string. |
| Unknown/custom | Manual fields only | User can store tags/comments and choose a provider after saving the key. |

### Tags

- Keys can have zero or more tags.
- Tag names are case-insensitive for grouping and stored normalized as lowercase trimmed strings.
- Tags appear as chips in the main key table.
- The Tags page lists all tags with counts.
- Selecting a tag shows all keys with that tag and a summary of known balances/warnings.
- Users can rename a tag, which updates all associated key records.

### Comments

- Each key can have one user comment.
- Comments appear as a column in the main key table and tag detail tables.
- Comments are searchable.

### About Page

The About page must explain:

- The app is client-only and runs on GitHub Pages.
- Keys are encrypted before local persistence, but browser-based key storage still depends on the user's device/browser security.
- localStorage is not used for plaintext keys.
- Metadata refresh sends the relevant key to the selected provider API from the user's browser.
- Some providers block browser calls with CORS.
- Some useful metadata requires admin APIs, OAuth, organization privileges, or dashboard exports.
- API keys should still be restricted, rotated, and revoked at the provider when no longer needed.

### UI Requirements

- First screen is the actual vault/key management interface, not a landing page.
- Use a restrained dashboard/vault design: dense enough for repeated use, but security-forward.
- Use icon-only refresh buttons with accessible labels and hover titles.
- Use text buttons for clear commands such as `Add key`, `Save encrypted`, and `Rename tag`.
- Use chips for tags and badges for refresh/provider status.
- Make the interface responsive for desktop and mobile.

## Technical Requirements

- Static frontend app deployable to GitHub Pages.
- TypeScript.
- Minimal runtime dependencies.
- Provider integrations are isolated behind a shared interface.
- Vault encryption logic is isolated and unit-tested.
- Provider detection logic is isolated and unit-tested.
- State persistence logic is isolated and unit-tested.
- The UI can run with seeded example data before a user creates a vault.

Recommended stack:

- Vite + React + TypeScript.
- Vitest + Testing Library for unit/component tests.
- WebCrypto for encryption.
- IndexedDB through a tiny helper wrapper implemented locally, avoiding a heavy state/database library for MVP.
- Lucide React for icons.

## Risks And Mitigations

- Browser storage is less secure than OS keychain or server-side vaults: encrypt with passphrase-derived key and document limitations.
- Users may forget passphrase: no recovery in MVP; document clearly.
- Provider APIs may reject browser requests due to CORS: show clear `limited` or `manual` status and explain on About.
- Provider key formats may change: detection is best-effort and overrideable.
- Refresh can hit rate limits: use manual refresh and conservative concurrency.
- Admin APIs may require high-privilege keys: document clearly and avoid pretending normal keys expose all metadata.

## Acceptance Criteria

- A GitHub repository exists at `goniszewski/api-key-manager`.
- The app can be built as a static site.
- A user can create/unlock/lock a local encrypted vault.
- A user can add a key, receive provider detection, override provider, add tags, add a comment, and save.
- Saved keys persist after reload and require passphrase unlock.
- The main Keys page shows tags, comments, refresh icon buttons, last checked time, and metadata/status.
- The Tags page groups keys by tag and includes tag-scoped metadata refresh.
- The About page documents all client-only and provider metadata limitations.
- Unit tests cover provider detection, vault encryption/decryption failure, tag normalization/grouping, and metadata refresh result mapping.

## References

- OpenRouter key limits endpoint: https://openrouter.ai/docs/api-reference/limits/
- OpenRouter API key creation metadata: https://openrouter.ai/docs/api-reference/api-keys/create-api-key
- DeepSeek balance endpoint: https://api-docs.deepseek.com/api/get-user-balance/
- OpenAI project API keys: https://platform.openai.com/docs/api-reference/project-api-keys/retrieve
- OpenAI usage/cost APIs: https://platform.openai.com/docs/api-reference/usage
- OpenAI browser key warning: https://platform.openai.com/docs/api-reference/authentication
- Anthropic admin usage reports: https://docs.anthropic.com/en/api/admin-api/usage-cost/get-messages-usage-report
- Gemini API key guidance: https://ai.google.dev/gemini-api/docs/api-key
- Google Cloud API key metadata: https://cloud.google.com/docs/authentication/api-keys
