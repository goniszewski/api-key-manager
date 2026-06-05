# API Key Manager MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, GitHub Pages-ready API key manager that stores encrypted keys locally, detects providers, supports tags/comments, and refreshes provider metadata on demand.

**Architecture:** Use a Vite React app with isolated domain modules for key records, provider detection, tags, vault crypto, persistence, and metadata refresh. UI state lives in React, while encrypted vault persistence stays behind a small IndexedDB adapter.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, WebCrypto, IndexedDB, Lucide React.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `vite.config.ts`: Vite, React, Vitest, and GitHub Pages base config.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript configuration.
- `index.html`: static app entry.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: app shell, route/view state, vault state orchestration.
- `src/styles.css`: dashboard/vault UI styling.
- `src/domain/types.ts`: shared domain types.
- `src/domain/providerDetection.ts`: key prefix detection.
- `src/domain/tags.ts`: tag normalization, grouping, rename helpers.
- `src/domain/keyRecords.ts`: key record creation, masking, metadata merge helpers.
- `src/domain/metadata.ts`: refresh result mapping and provider interface.
- `src/vault/crypto.ts`: WebCrypto passphrase key derivation and AES-GCM encrypt/decrypt.
- `src/vault/store.ts`: IndexedDB read/write/delete for encrypted vault envelope.
- `src/providers/index.ts`: provider refresh adapters and dispatch.
- `src/test/setup.ts`: Testing Library setup.
- `src/**/*.test.ts`, `src/**/*.test.tsx`: unit and component tests.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create tooling files**

Create package scripts for `dev`, `build`, `preview`, `test`, and `type-check`. Configure Vite with `base: "/api-key-manager/"` so Pages asset paths work.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Verify empty scaffold commands**

Run: `npm run type-check`

Expected: command succeeds after source files exist in later tasks; before source files exist, TypeScript may report missing input. Continue after Task 5 creates the app entry.

## Task 2: Provider Detection Domain

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/providerDetection.test.ts`
- Create: `src/domain/providerDetection.ts`

- [ ] **Step 1: Write failing provider detection tests**

```ts
import { describe, expect, it } from "vitest";
import { detectProvider } from "./providerDetection";

describe("detectProvider", () => {
  it("detects OpenRouter from sk-or-v1 prefix with high confidence", () => {
    expect(detectProvider("sk-or-v1-abc123")).toMatchObject({
      provider: "openrouter",
      confidence: "high",
    });
  });

  it("detects Gemini-style Google API keys", () => {
    expect(detectProvider("AIzaSyA-test-key")).toMatchObject({
      provider: "gemini",
      confidence: "high",
    });
  });

  it("treats generic sk keys as ambiguous OpenAI-like keys", () => {
    expect(detectProvider("sk-proj-test")).toMatchObject({
      provider: "openai",
      confidence: "medium",
    });
  });

  it("returns unknown for unrecognized keys", () => {
    expect(detectProvider("not-a-known-key")).toMatchObject({
      provider: "unknown",
      confidence: "unknown",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/providerDetection.test.ts`

Expected: FAIL because `providerDetection` does not exist.

- [ ] **Step 3: Implement provider detection**

Define provider and confidence union types in `types.ts`. Implement prefix checks in `providerDetection.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/domain/providerDetection.test.ts`

Expected: PASS.

## Task 3: Tags And Key Records Domain

**Files:**
- Create: `src/domain/tags.test.ts`
- Create: `src/domain/tags.ts`
- Create: `src/domain/keyRecords.test.ts`
- Create: `src/domain/keyRecords.ts`

- [ ] **Step 1: Write failing tag tests**

Test that tags are trimmed, lowercased, deduplicated, grouped with counts, and renamed across records.

- [ ] **Step 2: Run tag tests to verify failure**

Run: `npm test -- src/domain/tags.test.ts`

Expected: FAIL because `tags.ts` does not exist.

- [ ] **Step 3: Implement tag helpers**

Implement `normalizeTags`, `groupKeysByTag`, and `renameTag`.

- [ ] **Step 4: Write failing key record tests**

Test that `createKeyRecord` masks keys, normalizes tags, sets provider detection, and initializes refresh fields.

- [ ] **Step 5: Run key record tests to verify failure**

Run: `npm test -- src/domain/keyRecords.test.ts`

Expected: FAIL because `keyRecords.ts` does not exist.

- [ ] **Step 6: Implement key record helpers**

Implement `maskKey`, `createKeyRecord`, and `mergeMetadataResult`.

- [ ] **Step 7: Run domain tests**

Run: `npm test -- src/domain`

Expected: PASS.

## Task 4: Vault Crypto And Persistence

**Files:**
- Create: `src/vault/crypto.test.ts`
- Create: `src/vault/crypto.ts`
- Create: `src/vault/store.ts`

- [ ] **Step 1: Write failing crypto tests**

Test that encrypt/decrypt round-trips a vault payload and decrypting with the wrong passphrase rejects.

- [ ] **Step 2: Run crypto tests to verify failure**

Run: `npm test -- src/vault/crypto.test.ts`

Expected: FAIL because `crypto.ts` does not exist.

- [ ] **Step 3: Implement WebCrypto helpers**

Implement PBKDF2 key derivation and AES-GCM encrypt/decrypt with base64url encoding.

- [ ] **Step 4: Run crypto tests**

Run: `npm test -- src/vault/crypto.test.ts`

Expected: PASS.

- [ ] **Step 5: Implement IndexedDB adapter**

Implement `loadVaultEnvelope`, `saveVaultEnvelope`, and `deleteVaultEnvelope` in `store.ts`.

## Task 5: Metadata Refresh Domain And Providers

**Files:**
- Create: `src/domain/metadata.test.ts`
- Create: `src/domain/metadata.ts`
- Create: `src/providers/index.ts`

- [ ] **Step 1: Write failing metadata tests**

Test mapping successful OpenRouter/DeepSeek responses and CORS/network failures to user-facing refresh statuses.

- [ ] **Step 2: Run metadata tests to verify failure**

Run: `npm test -- src/domain/metadata.test.ts`

Expected: FAIL because `metadata.ts` does not exist.

- [ ] **Step 3: Implement metadata types and mapping**

Implement `MetadataRefreshResult`, `createManualResult`, `createLimitedResult`, and provider result normalization helpers.

- [ ] **Step 4: Implement provider dispatch**

Implement `refreshProviderMetadata(record, apiKey)` for OpenRouter, DeepSeek, and manual/limited fallbacks for providers without direct browser metadata support.

- [ ] **Step 5: Run metadata tests**

Run: `npm test -- src/domain/metadata.test.ts`

Expected: PASS.

## Task 6: React App UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing app tests**

Test that the app renders Keys, Tags, Providers, About, Add key, refresh icon buttons by accessible label, tag grouping, and comments.

- [ ] **Step 2: Run app tests to verify failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 3: Implement app shell and views**

Implement a client-only React UI with seed data, vault create/unlock/lock controls, Add Key form, Keys table, Tags detail, Providers overview, and About page.

- [ ] **Step 4: Wire actions**

Wire add key, provider detection override, tag/comment save, key refresh, global refresh, tag refresh, and tag rename in local React state.

- [ ] **Step 5: Run app tests**

Run: `npm test -- src/App.test.tsx`

Expected: PASS.

## Task 7: Build, Pages Workflow, And Verification

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `README.md`

- [ ] **Step 1: Add GitHub Pages workflow**

Create a workflow that installs dependencies, builds with Vite, uploads `dist`, and deploys to GitHub Pages on pushes to `main`.

- [ ] **Step 2: Add README**

Document local development, security model, provider metadata limitations, and GitHub Pages deployment.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test -- --run
npm run type-check
npm run build
```

Expected: all commands pass.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add .
git commit -m "feat: build API key manager MVP"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: PRD requirements map to Tasks 2-7. GitHub repo creation was completed before implementation planning.
- Completion scan: implementation files must not contain TODO/TBD markers.
- Type consistency: provider, confidence, refresh status, and key record field names match the PRD.
