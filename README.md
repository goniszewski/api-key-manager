# API Key Manager

A client-only API key manager for AI platforms. It runs as a static Vite app, stores the vault encrypted in the browser, supports tags and comments, detects providers from key prefixes, and refreshes provider metadata when the provider exposes it.

## Features

- Local encrypted vault using WebCrypto and a passphrase-derived AES-GCM key.
- Provider auto-detection with manual override.
- Multiple tags per key and one user comment per key.
- Tags page with grouped keys and tag-scoped metadata refresh.
- Icon-only metadata refresh buttons for all keys, one key, or one tag.
- Provider metadata support for OpenRouter and DeepSeek where browser calls are possible.
- Clear limited/manual statuses for OpenAI, Anthropic, Gemini, and unknown providers.
- Static GitHub Pages deployment.

## Security Model

This app has no backend. Keys are encrypted before local persistence and stored in IndexedDB. The passphrase is not stored, and decrypted keys live only in browser memory while the vault is unlocked.

This is still browser-based key storage. Device compromise, malicious extensions, XSS, weak passphrases, and an unlocked browser profile can put keys at risk. Restrict keys at the provider, rotate them regularly, and revoke unused keys in the provider dashboard.

localStorage is not used for plaintext keys.

## Provider Metadata Limits

Metadata refresh sends the relevant key from your browser to the selected provider API. Some providers block browser calls with CORS. Some useful metadata requires admin APIs, OAuth, organization privileges, or dashboard exports.

- OpenRouter: key limit, remaining credits, usage, and related key metadata where returned.
- DeepSeek: account availability and balance by currency.
- OpenAI: richer project key and cost metadata generally requires Admin API access.
- Anthropic: usage reports generally require organization Admin API access.
- Gemini: billing and key metadata generally live in AI Studio or Google Cloud.
- Unknown/custom: manual notes and tags only until a provider is selected.

## Development

```bash
npm install
npm run dev
```

Run verification:

```bash
npm test -- --run
npm run type-check
npm run build
```

## GitHub Pages

The Vite base path is `/api-key-manager/`. The Pages workflow builds and deploys `dist` on pushes to `main`.

