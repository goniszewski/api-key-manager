export type ProviderId = "openai" | "anthropic" | "deepseek" | "gemini" | "openrouter" | "unknown";

export type DetectionConfidence = "high" | "medium" | "low" | "unknown";

export type RefreshStatus = "never" | "checking" | "ok" | "limited" | "manual" | "error";

export type ProviderDetection = {
  provider: ProviderId;
  confidence: DetectionConfidence;
  reason: string;
};

export type ProviderMetadata = {
  balanceLabel?: string;
  usageLabel?: string;
  limitLabel?: string;
  expiresAt?: string | null;
  raw?: unknown;
};

export type MetadataRefreshResult = {
  status: Exclude<RefreshStatus, "never" | "checking">;
  checkedAt: string;
  metadata: ProviderMetadata | null;
  error: string | null;
};

export type ApiKeyRecord = {
  id: string;
  label: string;
  provider: ProviderId;
  providerDetection: ProviderDetection;
  maskedKey: string;
  keyValue?: string;
  tags: string[];
  comment: string;
  metadata: ProviderMetadata | null;
  lastCheckedAt: string | null;
  lastRefreshStatus: RefreshStatus;
  lastRefreshError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateKeyRecordInput = {
  label: string;
  key: string;
  tags: string[];
  comment: string;
  providerOverride?: ProviderId;
  now?: string;
};

