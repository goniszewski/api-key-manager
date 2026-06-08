# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Task 1 complete; Task 2 is the next pending hardening task.

**Goal:** Close the security gaps found in the June 8, 2026 audit without changing the app's client-only architecture.

**Architecture:** Keep the current Vite + React app and isolated vault/provider modules. Add small UI state changes in `src/App.tsx`, strengthen vault crypto defaults in `src/vault/crypto.ts`, and add browser/deployment guardrails at the HTML and GitHub Actions boundaries.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, WebCrypto, IndexedDB, GitHub Actions.

---

## File Structure

- `src/App.tsx`: lock behavior, API key field reveal toggle, first-refresh provider confirmation, metadata refresh state.
- `src/App.test.tsx`: component coverage for lock clearing plaintext form state, reveal toggle behavior, and refresh confirmation.
- `src/vault/crypto.ts`: PBKDF2 iteration constant and envelope validation.
- `src/vault/crypto.test.ts`: crypto envelope expectations and backwards-compatible decrypt coverage.
- `index.html`: static CSP meta tag for GitHub Pages deployment.
- `.github/workflows/pages.yml`: optional action SHA pinning.
- `README.md`: update security model with CSP, stronger KDF guidance, and provider refresh confirmation behavior.

## Task 1: Clear All Plaintext UI State On Lock

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [x] **Step 1: Write a failing test for lock clearing an open edit form**

Add a test that creates a key, opens edit mode, verifies the raw API key appears in the form, locks the vault, and verifies the API key field is removed or empty.

Run: `npm test -- src/App.test.tsx --run`

Observed before the fix: FAIL because `handleLockVault` cleared `records` and `passphrase` but left `form`, `showAddKey`, and `editingRecordId` untouched.

- [x] **Step 2: Reset form state during lock**

Update `handleLockVault()` in `src/App.tsx` so it clears records, passphrase, the add/edit form, and edit mode. If refresh confirmation state exists after Task 5, clear that too.

- [x] **Step 3: Verify the lock behavior**

Run: `npm test -- src/App.test.tsx --run`

Expected: PASS, including the new lock test.

Completion note: the regression test now verifies that locking clears the passphrase input, removes plaintext key rows, and unmounts the open edit form containing the raw API key.

## Task 2: Mask API Key Entry By Default

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css` if spacing is needed for the reveal button.

- [ ] **Step 1: Write a failing test for masked key entry**

Add coverage that the API key input renders as `type="password"` by default and that a `Show API key` button toggles it to `type="text"`.

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL because the current API key input has no explicit type and defaults to text.

- [ ] **Step 2: Add a reveal toggle**

Add `showApiKeyInput` state near the existing form state. Render the API key input as `type={showApiKeyInput ? "text" : "password"}` and add a small button with accessible labels `Show API key` and `Hide API key`.

- [ ] **Step 3: Reset reveal state**

Set `showApiKeyInput` back to `false` in `resetKeyForm()` and `handleLockVault()`.

- [ ] **Step 4: Verify UI behavior**

Run: `npm test -- src/App.test.tsx --run`

Expected: PASS.

## Task 3: Add A Static Content Security Policy

**Files:**
- Modify: `index.html`
- Modify: `README.md`

- [ ] **Step 1: Add CSP meta tag**

Add a CSP in the document head that permits only the app, required provider metadata calls, and favicon images:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://www.google.com data:; connect-src 'self' https://openrouter.ai https://api.deepseek.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests"
/>
```

The `style-src 'unsafe-inline'` allowance is acceptable for this Vite app only if required by the runtime/dev output. Tighten it later if production rendering works without it.

- [ ] **Step 2: Verify production build**

Run: `npm run build`

Expected: PASS. Confirm `dist/index.html` contains the CSP meta tag.

- [ ] **Step 3: Smoke test metadata fetch policy manually**

Run the app locally and verify OpenRouter/DeepSeek refresh attempts are not blocked by CSP. Provider CORS failures can still happen and are separate from CSP.

Run: `npm run dev`

Expected: local app loads; browser console has no CSP errors for app assets.

## Task 4: Raise PBKDF2 Work Factor With Backwards Compatibility

**Files:**
- Modify: `src/vault/crypto.ts`
- Modify: `src/vault/crypto.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write a failing test for the new default iteration count**

Add a test that encrypts a small payload and expects `envelope.iterations` to be `600_000`.

Run: `npm test -- src/vault/crypto.test.ts --run`

Expected: FAIL because the current constant is `210_000`.

- [ ] **Step 2: Keep old envelopes decryptable**

Add a test that constructs or produces an envelope with `iterations: 210_000` and verifies `decryptVault` still decrypts it with the correct passphrase.

Run: `npm test -- src/vault/crypto.test.ts --run`

Expected: PASS for backwards decrypt, FAIL only for the new default until Step 3.

- [ ] **Step 3: Update the default**

Change `ITERATIONS` in `src/vault/crypto.ts` to `600_000`. Do not reject lower iteration counts during decrypt; the envelope controls backwards compatibility.

- [ ] **Step 4: Verify crypto and full build**

Run:

```bash
npm test -- src/vault/crypto.test.ts --run
npm test -- --run
npm run type-check
npm run build
```

Expected: all commands pass.

## Task 5: Confirm Provider Destination Before First Metadata Refresh

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Write failing tests for refresh confirmation**

Add tests for per-key refresh and global refresh. The tests should verify that the first refresh for a key asks the user to confirm the destination provider/domain before calling `refreshProviderMetadata`.

Run: `npm test -- src/App.test.tsx --run`

Expected: FAIL because refresh currently calls the provider adapter immediately.

- [ ] **Step 2: Track confirmed refresh destinations**

Add state such as `confirmedRefreshRecordIds: string[]` or a `Set<string>` wrapper. A key is confirmed after the user accepts a prompt for its current provider.

- [ ] **Step 3: Add explicit confirmation copy**

Before refresh, show `window.confirm` copy similar to:

```text
Refresh metadata for "OpenRouter production" by sending this key to openrouter.ai?
```

If the user cancels, leave the record unchanged.

- [ ] **Step 4: Reset confirmation when key material or provider changes**

When editing a record changes the raw key or provider, require confirmation again before the next refresh.

- [ ] **Step 5: Verify refresh behavior**

Run:

```bash
npm test -- src/App.test.tsx --run
npm test -- --run
```

Expected: PASS.

## Task 6: Pin GitHub Actions More Strictly

**Files:**
- Modify: `.github/workflows/pages.yml`
- Optional create: `.github/dependabot.yml`

- [ ] **Step 1: Resolve current official action SHAs**

For each action in the workflow, resolve the current commit SHA for the tag in use:

- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4`

- [ ] **Step 2: Pin actions by SHA**

Replace tag-only references with SHA-pinned references and a comment naming the human-readable version.

- [ ] **Step 3: Add Dependabot action updates**

Add `.github/dependabot.yml` with GitHub Actions update checks so pinned actions can be maintained intentionally.

- [ ] **Step 4: Verify workflow syntax**

Run: `npm test -- --run`

Expected: app tests still pass. GitHub will validate workflow syntax on push.

## Task 7: Final Security Regression Sweep

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run static search**

Run:

```bash
rg -n "localStorage|sessionStorage|indexedDB|dangerouslySetInnerHTML|innerHTML|eval\\(|new Function|Authorization|fetch\\(|http://|https://|keyValue|passphrase|console\\.log" src index.html README.md vite.config.ts package.json
```

Expected: only intentional usages remain.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm audit
npm audit --omit=dev
npm test -- --run
npm run type-check
npm run build
git status --short
```

Expected: no vulnerabilities, tests pass, type-check passes, build passes, and only intentional files are changed.

- [ ] **Step 3: Update README security model**

Document:

- API key input is masked by default.
- Lock clears open form state.
- Metadata refresh asks for provider destination confirmation.
- New vault saves use 600,000 PBKDF2-HMAC-SHA256 iterations.
- Static deployment uses a CSP.
