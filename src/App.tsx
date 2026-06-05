import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Lock, Plus, RefreshCw, ShieldCheck, Tag, Unlock } from "lucide-react";
import { detectProvider } from "./domain/providerDetection";
import { createKeyRecord, mergeMetadataResult } from "./domain/keyRecords";
import { groupKeysByTag, normalizeTags, renameTag } from "./domain/tags";
import type { ApiKeyRecord, ProviderId } from "./domain/types";
import { refreshProviderMetadata } from "./providers";
import { encryptVault, decryptVault, type VaultEnvelope } from "./vault/crypto";
import { loadVaultEnvelope, saveVaultEnvelope } from "./vault/store";
import "./styles.css";

type View = "keys" | "tags" | "providers" | "about";

type AddKeyForm = {
  label: string;
  key: string;
  provider: ProviderId | "auto";
  tags: string;
  comment: string;
};

type VaultPayload = {
  version: 1;
  keys: ApiKeyRecord[];
};

const initialForm: AddKeyForm = {
  label: "",
  key: "",
  provider: "auto",
  tags: "",
  comment: "",
};

const now = "2026-06-05T12:00:00.000Z";

const seedRecords: ApiKeyRecord[] = [
  {
    ...createKeyRecord({
      label: "OpenRouter production",
      key: "sk-or-v1-seed-openrouter-secret",
      tags: ["prod", "routing"],
      comment: "Used by public app fallback chain.",
      now,
    }),
    id: "seed-openrouter",
    metadata: { balanceLabel: "$48.20 left", usageLabel: "$31.00 this month", limitLabel: "$100.00 limit" },
    lastCheckedAt: "2026-06-05T11:58:00.000Z",
    lastRefreshStatus: "ok",
  },
  {
    ...createKeyRecord({
      label: "DeepSeek batch",
      key: "sk-deepseek-seed-secret",
      providerOverride: "deepseek",
      tags: ["batch", "watch"],
      comment: "Low balance; top up before monthly export.",
      now,
    }),
    id: "seed-deepseek",
    provider: "deepseek",
    metadata: { balanceLabel: "$6.31" },
    lastCheckedAt: "2026-06-05T11:56:00.000Z",
    lastRefreshStatus: "ok",
  },
  {
    ...createKeyRecord({
      label: "OpenAI admin",
      key: "sk-proj-seed-openai-secret",
      providerOverride: "openai",
      tags: ["admin", "prod"],
      comment: "Only use for organization metadata refresh.",
      now,
    }),
    id: "seed-openai",
    lastCheckedAt: "2026-06-05T11:00:00.000Z",
    lastRefreshStatus: "limited",
    lastRefreshError: "OpenAI metadata generally requires Admin API access.",
  },
  {
    ...createKeyRecord({
      label: "Gemini lab",
      key: "AIzaSySeedGeminiKey",
      providerOverride: "gemini",
      tags: ["lab"],
      comment: "Billing checked in AI Studio manually.",
      now,
    }),
    id: "seed-gemini",
    lastRefreshStatus: "manual",
    lastRefreshError: "Gemini billing must be checked in AI Studio.",
  },
];

const providerLabels: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  unknown: "Unknown",
};

export default function App() {
  const [view, setView] = useState<View>(() => viewFromHash());
  const [records, setRecords] = useState<ApiKeyRecord[]>(seedRecords);
  const [selectedTag, setSelectedTag] = useState("prod");
  const [showAddKey, setShowAddKey] = useState(false);
  const [form, setForm] = useState<AddKeyForm>(initialForm);
  const [passphrase, setPassphrase] = useState("");
  const [vaultEnvelope, setVaultEnvelope] = useState<VaultEnvelope | null>(null);
  const [vaultMessage, setVaultMessage] = useState("Demo data is loaded. Create a passphrase to save an encrypted vault.");

  const detection = detectProvider(form.key);
  const tagGroups = useMemo(() => groupKeysByTag(records), [records]);
  const activeTag = tagGroups.find((group) => group.tag === selectedTag) ?? tagGroups[0] ?? null;

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash());

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function navigate(nextView: View) {
    setView(nextView);
    window.history.replaceState(null, "", `#${nextView}`);
  }

  async function handleLoadVault() {
    try {
      const envelope = await loadVaultEnvelope();
      setVaultEnvelope(envelope);
      if (!envelope) {
        setVaultMessage("No encrypted vault found in this browser.");
        return;
      }
      setVaultMessage("Encrypted vault found. Enter passphrase to unlock.");
    } catch {
      setVaultMessage("This browser does not expose IndexedDB storage to the app.");
    }
  }

  async function handleSaveVault() {
    if (!passphrase.trim()) {
      setVaultMessage("Enter a passphrase before saving the encrypted vault.");
      return;
    }

    const envelope = await encryptVault({ version: 1, keys: records } satisfies VaultPayload, passphrase);
    await saveVaultEnvelope(envelope);
    setVaultEnvelope(envelope);
    setVaultMessage("Encrypted vault saved locally in this browser.");
  }

  async function handleUnlockVault() {
    if (!vaultEnvelope || !passphrase.trim()) return;

    try {
      const payload = await decryptVault<VaultPayload>(vaultEnvelope, passphrase);
      setRecords(payload.keys);
      setVaultMessage("Vault unlocked in memory.");
    } catch {
      setVaultMessage("Unable to unlock vault with that passphrase.");
    }
  }

  function handleLockVault() {
    setRecords([]);
    setPassphrase("");
    setVaultMessage("Vault locked. Decrypted keys were cleared from memory.");
  }

  function handleAddKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const providerOverride = form.provider === "auto" ? undefined : form.provider;
    const record = createKeyRecord({
      label: form.label,
      key: form.key,
      tags: form.tags.split(","),
      comment: form.comment,
      providerOverride,
    });

    setRecords((current) => [record, ...current]);
    setForm(initialForm);
    setShowAddKey(false);
    navigate("keys");
  }

  async function refreshKey(record: ApiKeyRecord) {
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? { ...item, lastRefreshStatus: "checking" } : item)),
    );
    const result = await refreshProviderMetadata(record);
    setRecords((current) => current.map((item) => (item.id === record.id ? mergeMetadataResult(item, result) : item)));
  }

  async function refreshAll(keys: ApiKeyRecord[]) {
    for (const record of keys) {
      await refreshKey(record);
    }
  }

  function handleRenameActiveTag() {
    if (!activeTag) return;
    const nextName = activeTag.tag === "prod" ? "production" : `${activeTag.tag}-renamed`;
    const updated = renameTag(records, activeTag.tag, nextName);
    setRecords(updated);
    setSelectedTag(normalizeTags([nextName])[0] ?? nextName);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local encrypted vault</p>
          <h1>API Key Manager</h1>
        </div>
        <nav className="nav-tabs" aria-label="Primary navigation">
          {(["keys", "tags", "providers", "about"] as View[]).map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              type="button"
              onClick={() => navigate(item)}
            >
              {titleCase(item)}
            </button>
          ))}
        </nav>
      </header>

      <section className="vault-panel" aria-label="Vault controls">
        <div>
          <div className="vault-title">
            <ShieldCheck size={18} aria-hidden="true" />
            <strong>Browser-only storage</strong>
          </div>
          <p>{vaultMessage}</p>
        </div>
        <div className="vault-actions">
          <input
            aria-label="Vault passphrase"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            placeholder="Passphrase"
            type="password"
          />
          <button type="button" className="secondary" onClick={handleLoadVault}>
            <Unlock size={16} aria-hidden="true" />
            Find vault
          </button>
          <button type="button" className="secondary" onClick={handleUnlockVault}>
            <Unlock size={16} aria-hidden="true" />
            Unlock
          </button>
          <button type="button" className="primary" onClick={handleSaveVault}>
            <Lock size={16} aria-hidden="true" />
            Save vault
          </button>
          <button type="button" className="icon-button" aria-label="Lock vault" title="Lock vault" onClick={handleLockVault}>
            <Lock size={16} aria-hidden="true" />
          </button>
        </div>
      </section>

      {view === "keys" && (
        <KeysView
          records={records}
          showAddKey={showAddKey}
          form={form}
          detection={detection}
          setForm={setForm}
          onAddClick={() => setShowAddKey(true)}
          onAddKey={handleAddKey}
          onCancelAdd={() => setShowAddKey(false)}
          onRefreshAll={() => void refreshAll(records)}
          onRefreshKey={(record) => void refreshKey(record)}
        />
      )}
      {view === "tags" && (
        <TagsView
          groups={tagGroups}
          activeTag={activeTag}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          onRefreshTag={(keys) => void refreshAll(keys)}
          onRefreshKey={(record) => void refreshKey(record)}
          onRenameTag={handleRenameActiveTag}
        />
      )}
      {view === "providers" && <ProvidersView records={records} />}
      {view === "about" && <AboutView />}
    </div>
  );
}

function KeysView(props: {
  records: ApiKeyRecord[];
  showAddKey: boolean;
  form: AddKeyForm;
  detection: ReturnType<typeof detectProvider>;
  setForm: (updater: AddKeyForm | ((current: AddKeyForm) => AddKeyForm)) => void;
  onAddClick: () => void;
  onAddKey: (event: FormEvent<HTMLFormElement>) => void;
  onCancelAdd: () => void;
  onRefreshAll: () => void;
  onRefreshKey: (record: ApiKeyRecord) => void;
}) {
  return (
    <main className="panel">
      <div className="panel-toolbar">
        <div className="search-box">Search keys, comments, or tags</div>
        <div className="toolbar-actions">
          <IconButton label="Refresh metadata" onClick={props.onRefreshAll} />
          <button type="button" className="primary" onClick={props.onAddClick}>
            <Plus size={16} aria-hidden="true" />
            Add key
          </button>
        </div>
      </div>

      {props.showAddKey && (
        <form className="add-key-form" onSubmit={props.onAddKey}>
          <div className="form-grid">
            <label>
              <span>Label</span>
              <input
                aria-label="Label"
                value={props.form.label}
                onChange={(event) => props.setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </label>
            <label>
              <span>API key</span>
              <input
                aria-label="API key"
                value={props.form.key}
                onChange={(event) => props.setForm((current) => ({ ...current, key: event.target.value }))}
              />
            </label>
            <label>
              <span>Provider</span>
              <select
                aria-label="Provider"
                value={props.form.provider}
                onChange={(event) =>
                  props.setForm((current) => ({ ...current, provider: event.target.value as AddKeyForm["provider"] }))
                }
              >
                <option value="auto">Auto-detect</option>
                {Object.entries(providerLabels).map(([provider, label]) => (
                  <option key={provider} value={provider}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tags</span>
              <input
                aria-label="Tags"
                value={props.form.tags}
                onChange={(event) => props.setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </label>
            <label className="wide-field">
              <span>Comment</span>
              <textarea
                aria-label="Comment"
                value={props.form.comment}
                onChange={(event) => props.setForm((current) => ({ ...current, comment: event.target.value }))}
              />
            </label>
          </div>
          <div className="detection-card">
            <KeyRound size={18} aria-hidden="true" />
            <strong>{providerLabels[props.detection.provider]} detected</strong>
            <span>{props.detection.confidence} confidence</span>
            <p>{props.detection.reason}</p>
          </div>
          <div className="form-actions">
            <button type="submit" className="primary">
              Save encrypted
            </button>
            <button type="button" className="secondary" onClick={props.onCancelAdd}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <KeyTable records={props.records} onRefreshKey={props.onRefreshKey} />
    </main>
  );
}

function TagsView(props: {
  groups: ReturnType<typeof groupKeysByTag>;
  activeTag: ReturnType<typeof groupKeysByTag>[number] | null;
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  onRefreshTag: (keys: ApiKeyRecord[]) => void;
  onRefreshKey: (record: ApiKeyRecord) => void;
  onRenameTag: () => void;
}) {
  if (!props.activeTag) {
    return <main className="panel empty-state">No tags yet.</main>;
  }

  return (
    <main className="panel tag-layout">
      <section className="tag-chip-bar" aria-label="Tag filters">
        <h2>All tags</h2>
        <div className="tag-chip-list">
          {props.groups.map((group) => (
            <button
              key={group.tag}
              aria-label={`${group.tag} ${group.count} ${group.count === 1 ? "key" : "keys"}`}
              className={props.selectedTag === group.tag ? "active" : ""}
              type="button"
              onClick={() => props.onSelectTag(group.tag)}
            >
              <Tag size={14} aria-hidden="true" />
              <span>{group.tag}</span>
              <b>{group.count}</b>
            </button>
          ))}
        </div>
      </section>
      <section className="tag-detail" aria-label={`Tag ${props.activeTag.tag}`}>
        <div className="tag-heading">
          <div>
            <h2>{props.activeTag.tag}</h2>
            <p>Keys grouped by this tag share the same metadata and comments columns as the main key list.</p>
          </div>
          <div className="toolbar-actions">
            <IconButton label="Refresh tag metadata" onClick={() => props.onRefreshTag(props.activeTag?.keys ?? [])} />
            <button type="button" className="primary" onClick={props.onRenameTag}>
              Rename tag
            </button>
          </div>
        </div>
        <section className="summary-strip" aria-label="Tag summary">
          <Metric value={`${props.activeTag.count} keys`} label="Tagged keys" />
          <Metric value={`${props.activeTag.keys.filter((key) => key.lastRefreshStatus !== "ok").length} warnings`} label="Needs attention" />
          <Metric value={knownBalance(props.activeTag.keys)} label="Known balance" />
        </section>
        <KeyTable records={props.activeTag.keys} onRefreshKey={props.onRefreshKey} compact />
      </section>
    </main>
  );
}

function ProvidersView({ records }: { records: ApiKeyRecord[] }) {
  const providers = Object.entries(providerLabels).filter(([provider]) => provider !== "unknown");

  return (
    <main className="panel provider-grid">
      {providers.map(([provider, label]) => {
        const providerRecords = records.filter((record) => record.provider === provider);
        return (
          <section className="provider-card" key={provider}>
            <h2>{label}</h2>
            <p>{providerRecords.length} saved keys</p>
            <strong>{knownBalance(providerRecords)}</strong>
            <span>{providerSupportCopy(provider as ProviderId)}</span>
          </section>
        );
      })}
    </main>
  );
}

function AboutView() {
  return (
    <main className="panel about-page">
      <h2>About this vault</h2>
      <p>
        API Key Manager runs entirely in your browser as a static GitHub Pages app. It has no application backend and no
        hosted account system.
      </p>
      <p>
        Keys are encrypted before local persistence with WebCrypto. localStorage is not used for plaintext keys, but
        browser-based storage still depends on your device, browser profile, and passphrase hygiene.
      </p>
      <p>
        Metadata refresh sends the selected key from your browser to the provider API. Some providers block browser
        metadata calls with CORS, and some useful metadata requires admin APIs, OAuth, organization permissions, or
        dashboard exports.
      </p>
      <p>
        Restrict keys at the provider where possible, rotate them regularly, and revoke keys in the provider dashboard
        when they are no longer needed.
      </p>
    </main>
  );
}

function KeyTable({
  records,
  onRefreshKey,
  compact = false,
}: {
  records: ApiKeyRecord[];
  onRefreshKey: (record: ApiKeyRecord) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "key-table compact" : "key-table"}>
      <div className="key-row header">
        <span>Key</span>
        {!compact && <span>Provider</span>}
        <span>Status</span>
        <span>Balance</span>
        <span>Tags</span>
        <span>Comment</span>
        <span>Check</span>
      </div>
      {records.map((record) => (
        <div className="key-row" key={record.id}>
          <span>
            <strong>{record.label}</strong>
            <small>{record.maskedKey}</small>
          </span>
          {!compact && <span>{providerLabels[record.provider]}</span>}
          <span className={`status status-${record.lastRefreshStatus}`}>{record.lastRefreshStatus}</span>
          <span>{record.metadata?.balanceLabel ?? "-"}</span>
          <span className="tag-list">
            {record.tags.map((tag) => (
              <b key={tag}>{tag}</b>
            ))}
          </span>
          <span className="comment-cell">{record.comment || "-"}</span>
          <span className="check-cell">
            <small>{formatChecked(record)}</small>
            <IconButton label={`Refresh ${record.label}`} onClick={() => onRefreshKey(record)} small />
          </span>
        </div>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, small = false }: { label: string; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      className={small ? "icon-button small" : "icon-button"}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <RefreshCw size={small ? 15 : 17} aria-hidden="true" />
    </button>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="summary-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function knownBalance(records: ApiKeyRecord[]): string {
  const first = records.find((record) => record.metadata?.balanceLabel);
  return first?.metadata?.balanceLabel ?? "Manual";
}

function providerSupportCopy(provider: ProviderId): string {
  if (provider === "openrouter") return "Fullest direct key metadata support.";
  if (provider === "deepseek") return "Direct account balance endpoint.";
  if (provider === "gemini") return "Billing usually checked in AI Studio.";
  if (provider === "anthropic") return "Usage metadata generally requires Admin API.";
  if (provider === "openai") return "Richer metadata generally requires Admin API.";
  return "Manual provider.";
}

function formatChecked(record: ApiKeyRecord): string {
  if (record.lastRefreshStatus === "manual") return "manual";
  if (!record.lastCheckedAt) return "never";
  const checked = new Date(record.lastCheckedAt).getTime();
  const reference = new Date("2026-06-05T12:00:00.000Z").getTime();
  const minutes = Math.max(1, Math.round((reference - checked) / 60_000));
  if (minutes >= 60) return `${Math.round(minutes / 60)}h ago`;
  return `${minutes}m ago`;
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function viewFromHash(): View {
  const hash = window.location.hash.replace("#", "");

  if (hash === "tags" || hash === "providers" || hash === "about") {
    return hash;
  }

  return "keys";
}
