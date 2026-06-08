import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { KeyRound, Lock, Pencil, Plus, RefreshCw, ShieldCheck, Tag, Trash2, Unlock } from "lucide-react";
import { detectProvider } from "./domain/providerDetection";
import { createKeyRecord, mergeMetadataResult, updateKeyRecord } from "./domain/keyRecords";
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

const SHOWCASE_DISMISSED_KEY = "api-key-manager-showcase-dismissed";

const initialForm: AddKeyForm = {
  label: "",
  key: "",
  provider: "auto",
  tags: "",
  comment: "",
};

const providerLabels: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  unknown: "Unknown",
};

const providerDomains: Record<ProviderId, string> = {
  openai: "openai.com",
  anthropic: "anthropic.com",
  deepseek: "deepseek.com",
  gemini: "gemini.google.com",
  openrouter: "openrouter.ai",
  unknown: "",
};

const demoRecords: ApiKeyRecord[] = [
  {
    id: "demo-openrouter",
    label: "OpenRouter production",
    provider: "openrouter",
    providerDetection: {
      provider: "openrouter",
      confidence: "high",
      reason: "OpenRouter keys commonly start with sk-or-v1-.",
    },
    maskedKey: "sk-or-v1...cret",
    tags: ["prod", "routing"],
    comment: "Used by public app fallback chain.",
    metadata: { balanceLabel: "$48.20 left", usageLabel: "$31.00 this month", limitLabel: "$100.00 limit" },
    lastCheckedAt: "2026-06-05T11:58:00.000Z",
    lastRefreshStatus: "ok",
    lastRefreshError: null,
    createdAt: "2026-06-05T11:58:00.000Z",
    updatedAt: "2026-06-05T11:58:00.000Z",
  },
  {
    id: "demo-deepseek",
    label: "DeepSeek batch",
    provider: "deepseek",
    providerDetection: {
      provider: "deepseek",
      confidence: "medium",
      reason: "DeepSeek keys usually use an sk- prefix and can be confirmed by provider selection.",
    },
    maskedKey: "sk-dee...cret",
    tags: ["batch", "watch"],
    comment: "Low balance; top up before monthly export.",
    metadata: { balanceLabel: "$6.31" },
    lastCheckedAt: "2026-06-05T11:56:00.000Z",
    lastRefreshStatus: "ok",
    lastRefreshError: null,
    createdAt: "2026-06-05T11:56:00.000Z",
    updatedAt: "2026-06-05T11:56:00.000Z",
  },
  {
    id: "demo-openai",
    label: "OpenAI admin",
    provider: "openai",
    providerDetection: {
      provider: "openai",
      confidence: "high",
      reason: "OpenAI keys commonly start with sk-proj- or sk-.",
    },
    maskedKey: "sk-pro...cret",
    tags: ["admin", "prod"],
    comment: "Only use for organization metadata refresh.",
    metadata: null,
    lastCheckedAt: "2026-06-05T11:00:00.000Z",
    lastRefreshStatus: "limited",
    lastRefreshError: "OpenAI metadata generally requires Admin API access.",
    createdAt: "2026-06-05T11:00:00.000Z",
    updatedAt: "2026-06-05T11:00:00.000Z",
  },
];

export default function App() {
  const [view, setView] = useState<View>(() => viewFromHash());
  const [records, setRecords] = useState<ApiKeyRecord[]>([]);
  const [selectedTag, setSelectedTag] = useState("prod");
  const [showDemo, setShowDemo] = useState(() => !hasDismissedShowcase());
  const [showAddKey, setShowAddKey] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [form, setForm] = useState<AddKeyForm>(initialForm);
  const [passphrase, setPassphrase] = useState("");
  const [vaultEnvelope, setVaultEnvelope] = useState<VaultEnvelope | null>(null);
  const [vaultMessage, setVaultMessage] = useState("Create a passphrase to save an encrypted vault in this browser.");

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

  function resetKeyForm() {
    setForm(initialForm);
    setShowAddKey(false);
    setEditingRecordId(null);
  }

  function handleStartAddKey() {
    setForm(initialForm);
    setEditingRecordId(null);
    setShowAddKey(true);
  }

  function handleStartEditKey(record: ApiKeyRecord) {
    setForm({
      label: record.label,
      key: record.keyValue ?? "",
      provider: record.provider,
      tags: record.tags.join(", "),
      comment: record.comment,
    });
    setEditingRecordId(record.id);
    setShowAddKey(true);
    navigate("keys");
  }

  function handleConfirmProvider(provider: ProviderId) {
    setForm((current) => ({ ...current, provider }));
  }

  function handleSubmitKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const providerOverride = form.provider === "auto" ? undefined : form.provider;
    const input = {
      label: form.label,
      key: form.key,
      tags: form.tags.split(","),
      comment: form.comment,
      providerOverride,
    };

    if (editingRecordId) {
      setRecords((current) =>
        current.map((record) => (record.id === editingRecordId ? updateKeyRecord(record, input) : record)),
      );
      setVaultMessage("Key updated in memory. Save vault to persist this change.");
    } else {
      const record = createKeyRecord(input);
      dismissShowcase(setShowDemo);
      setRecords((current) => [record, ...current]);
      setVaultMessage("Key added in memory. Save vault to persist this change.");
    }

    resetKeyForm();
    navigate("keys");
  }

  function handleDeleteKey(record: ApiKeyRecord) {
    if (!window.confirm(`Delete "${record.label}" from this vault?`)) return;

    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (editingRecordId === record.id) {
      resetKeyForm();
    }
    setVaultMessage("Key deleted in memory. Save vault to persist this change.");
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
          isEditing={Boolean(editingRecordId)}
          onAddClick={handleStartAddKey}
          onSubmitKey={handleSubmitKey}
          onCancelForm={resetKeyForm}
          onConfirmProvider={handleConfirmProvider}
          showDemo={showDemo && records.length === 0}
          onClearDemo={() => dismissShowcase(setShowDemo)}
          onRefreshAll={() => void refreshAll(records)}
          onRefreshKey={(record) => void refreshKey(record)}
          onEditKey={handleStartEditKey}
          onDeleteKey={handleDeleteKey}
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
          onEditKey={handleStartEditKey}
          onDeleteKey={handleDeleteKey}
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
  isEditing: boolean;
  onAddClick: () => void;
  onSubmitKey: (event: FormEvent<HTMLFormElement>) => void;
  onCancelForm: () => void;
  onConfirmProvider: (provider: ProviderId) => void;
  showDemo: boolean;
  onClearDemo: () => void;
  onRefreshAll: () => void;
  onRefreshKey: (record: ApiKeyRecord) => void;
  onEditKey: (record: ApiKeyRecord) => void;
  onDeleteKey: (record: ApiKeyRecord) => void;
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
        <form className="add-key-form" onSubmit={props.onSubmitKey}>
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
                onChange={(event) => props.setForm((current) => ({ ...current, key: event.target.value, provider: "auto" }))}
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
          <ProviderConfirmation
            detection={props.detection}
            form={props.form}
            onConfirmProvider={props.onConfirmProvider}
          />
          <div className="form-actions">
            <button type="submit" className="primary">
              {props.isEditing ? "Save changes" : "Save encrypted"}
            </button>
            <button type="button" className="secondary" onClick={props.onCancelForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {props.records.length > 0 ? (
        <KeyTable
          records={props.records}
          onRefreshKey={props.onRefreshKey}
          onEditKey={props.onEditKey}
          onDeleteKey={props.onDeleteKey}
        />
      ) : props.showDemo ? (
        <DemoShowcase onClear={props.onClearDemo} />
      ) : (
        <section className="empty-state">
          <h2>No keys yet.</h2>
          <p>Add your first API key to start tracking provider metadata, tags, and notes.</p>
        </section>
      )}
    </main>
  );
}

function DemoShowcase({ onClear }: { onClear: () => void }) {
  return (
    <section className="demo-showcase" aria-label="Demo key showcase">
      <div className="showcase-heading">
        <div>
          <p className="eyebrow">Showcase data</p>
          <h2>Example metadata layout</h2>
          <p>Dimmed sample rows show how balances, tags, comments, and metadata checks will look after keys are added.</p>
        </div>
        <button type="button" className="link-button" aria-label="Clear showcase data" onClick={onClear}>
          Clear showcase
        </button>
      </div>
      <KeyTable records={demoRecords} onRefreshKey={() => undefined} demo disableRefresh />
    </section>
  );
}

function TagsView(props: {
  groups: ReturnType<typeof groupKeysByTag>;
  activeTag: ReturnType<typeof groupKeysByTag>[number] | null;
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  onRefreshTag: (keys: ApiKeyRecord[]) => void;
  onRefreshKey: (record: ApiKeyRecord) => void;
  onEditKey: (record: ApiKeyRecord) => void;
  onDeleteKey: (record: ApiKeyRecord) => void;
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
        <KeyTable
          records={props.activeTag.keys}
          onRefreshKey={props.onRefreshKey}
          onEditKey={props.onEditKey}
          onDeleteKey={props.onDeleteKey}
          compact
        />
      </section>
    </main>
  );
}

function ProviderConfirmation({
  detection,
  form,
  onConfirmProvider,
}: {
  detection: ReturnType<typeof detectProvider>;
  form: AddKeyForm;
  onConfirmProvider: (provider: ProviderId) => void;
}) {
  const isAmbiguousOpenAiShape = form.key.trim() !== "" && form.provider === "auto" && detection.confidence === "medium";
  const selectedProvider = form.provider === "auto" ? detection.provider : form.provider;
  const title = isAmbiguousOpenAiShape
    ? "OpenAI-style key detected"
    : form.provider === "auto"
      ? `${providerLabels[detection.provider]} detected`
      : `${providerLabels[form.provider]} selected`;
  const detail = isAmbiguousOpenAiShape
    ? "DeepSeek and other OpenAI-compatible platforms can use the same key shape. Confirm which provider this key belongs to."
    : detection.reason;

  return (
    <div className="detection-card">
      <KeyRound size={18} aria-hidden="true" />
      <strong>{title}</strong>
      <span>
        {form.provider === "auto" ? detection.confidence : "confirmed"} confidence
      </span>
      <p>{detail}</p>
      {isAmbiguousOpenAiShape && (
        <div className="provider-confirmation" aria-label="Confirm provider">
          {(["openai", "deepseek", "unknown"] as ProviderId[]).map((provider) => (
            <button
              key={provider}
              type="button"
              className={selectedProvider === provider ? "active" : ""}
              onClick={() => onConfirmProvider(provider)}
            >
              {provider === "unknown" ? "Unknown/custom" : providerLabels[provider]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProvidersView({ records }: { records: ApiKeyRecord[] }) {
  const providers = Object.entries(providerLabels).filter(([provider]) => provider !== "unknown");

  return (
    <main className="panel provider-grid">
      {providers.map(([provider, label]) => {
        const providerId = provider as ProviderId;
        const providerRecords = records.filter((record) => record.provider === providerId);
        const balance = knownBalance(providerRecords);

        return (
          <section className="provider-card" aria-label={`${label} provider summary`} key={provider}>
            <div className="provider-card-header">
              <span className="provider-icon">
                <span aria-hidden="true" className="provider-icon-fallback">
                  {label.slice(0, 1)}
                </span>
                <img
                  alt={`${label} favicon`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={providerFaviconUrl(providerId)}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </span>
              <div>
                <h2>{label}</h2>
                <span className="provider-count">{keyCountLabel(providerRecords.length)}</span>
              </div>
            </div>
            <div className="provider-card-body">
              <strong className={balance === "Manual" ? "provider-signal manual" : "provider-signal known"}>{balance}</strong>
              <span className="provider-copy">{providerSupportCopy(providerId)}</span>
            </div>
          </section>
        );
      })}
    </main>
  );
}

function AboutView() {
  const rows = [
    {
      area: "Runtime",
      detail:
        "API Key Manager runs entirely in your browser as a static GitHub Pages app. It has no application backend and no hosted account system.",
    },
    {
      area: "Key storage",
      detail:
        "Keys are encrypted before local persistence with WebCrypto. localStorage is not used for plaintext keys, but browser-based storage still depends on your device, browser profile, and passphrase hygiene.",
    },
    {
      area: "Metadata refresh",
      detail:
        "Metadata refresh sends the selected key from your browser to the provider API. Some providers block browser metadata calls with CORS, and some useful metadata requires admin APIs, OAuth, organization permissions, or dashboard exports.",
    },
    {
      area: "Key hygiene",
      detail:
        "Restrict keys at the provider where possible, rotate them regularly, and revoke keys in the provider dashboard when they are no longer needed.",
    },
  ];

  return (
    <main className="panel about-page">
      <h2>About this vault</h2>
      <table className="about-table" aria-label="Vault limitations and responsibilities">
        <thead>
          <tr>
            <th scope="col">Area</th>
            <th scope="col">What to know</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.area}>
              <th scope="row">{row.area}</th>
              <td>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function KeyTable({
  records,
  onRefreshKey,
  onEditKey,
  onDeleteKey,
  compact = false,
  demo = false,
  disableRefresh = false,
}: {
  records: ApiKeyRecord[];
  onRefreshKey: (record: ApiKeyRecord) => void;
  onEditKey?: (record: ApiKeyRecord) => void;
  onDeleteKey?: (record: ApiKeyRecord) => void;
  compact?: boolean;
  demo?: boolean;
  disableRefresh?: boolean;
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
        <span>Actions</span>
      </div>
      {records.map((record) => (
        <div className={demo ? "key-row demo-row" : "key-row"} key={record.id}>
          <span>
            <span className="key-title-line">
              <strong>{record.label}</strong>
              {demo && <em className="demo-badge">Demo</em>}
            </span>
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
            <span className="row-actions">
              <IconButton
                label={`Refresh ${record.label}`}
                onClick={() => onRefreshKey(record)}
                small
                disabled={disableRefresh}
              />
              {!demo && onEditKey && (
                <ActionButton label={`Edit ${record.label}`} onClick={() => onEditKey(record)}>
                  <Pencil size={14} aria-hidden="true" />
                </ActionButton>
              )}
              {!demo && onDeleteKey && (
                <ActionButton label={`Delete ${record.label}`} onClick={() => onDeleteKey(record)} danger>
                  <Trash2 size={14} aria-hidden="true" />
                </ActionButton>
              )}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={danger ? "icon-button small danger" : "icon-button small"}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  small = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={small ? "icon-button small" : "icon-button"}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
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

function keyCountLabel(count: number): string {
  return `${count} ${count === 1 ? "key" : "keys"}`;
}

function providerFaviconUrl(provider: ProviderId): string {
  return `https://www.google.com/s2/favicons?domain=${providerDomains[provider]}&sz=64`;
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

function hasDismissedShowcase(): boolean {
  try {
    return window.localStorage.getItem(SHOWCASE_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function dismissShowcase(setShowDemo: (value: boolean) => void) {
  setShowDemo(false);
  try {
    window.localStorage.setItem(SHOWCASE_DISMISSED_KEY, "true");
  } catch {
    // The showcase is only a UI preference; storage failures should not block key entry.
  }
}
