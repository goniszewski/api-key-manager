import { detectProvider } from "./providerDetection";
import { normalizeTags } from "./tags";
import type { ApiKeyRecord, CreateKeyRecordInput, MetadataRefreshResult } from "./types";

export function maskKey(key: string): string {
  const value = key.trim();

  if (value.startsWith("sk-or-v1-") && value.length > 13) {
    return `sk-or-v1...${value.slice(-4)}`;
  }

  if (value.length <= 10) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function createKeyRecord(input: CreateKeyRecordInput): ApiKeyRecord {
  const now = input.now ?? new Date().toISOString();
  const key = input.key.trim();
  const detection = detectProvider(key);
  const provider = input.providerOverride ?? detection.provider;

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: input.label.trim() || maskKey(key),
    provider,
    providerDetection: detection,
    maskedKey: maskKey(key),
    keyValue: key,
    tags: normalizeTags(input.tags),
    comment: input.comment.trim(),
    metadata: null,
    lastCheckedAt: null,
    lastRefreshStatus: "never",
    lastRefreshError: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateKeyRecord(record: ApiKeyRecord, input: CreateKeyRecordInput): ApiKeyRecord {
  const now = input.now ?? new Date().toISOString();
  const key = input.key.trim();
  const detection = detectProvider(key);
  const provider = input.providerOverride ?? detection.provider;
  const changedKeyMaterial = key !== (record.keyValue ?? "") || provider !== record.provider;

  return {
    ...record,
    label: input.label.trim() || maskKey(key),
    provider,
    providerDetection: detection,
    maskedKey: maskKey(key),
    keyValue: key,
    tags: normalizeTags(input.tags),
    comment: input.comment.trim(),
    metadata: changedKeyMaterial ? null : record.metadata,
    lastCheckedAt: changedKeyMaterial ? null : record.lastCheckedAt,
    lastRefreshStatus: changedKeyMaterial ? "never" : record.lastRefreshStatus,
    lastRefreshError: changedKeyMaterial ? null : record.lastRefreshError,
    updatedAt: now,
  };
}

export function mergeMetadataResult(record: ApiKeyRecord, result: MetadataRefreshResult): ApiKeyRecord {
  return {
    ...record,
    metadata: result.metadata ?? record.metadata,
    lastCheckedAt: result.checkedAt,
    lastRefreshStatus: result.status,
    lastRefreshError: result.error,
    updatedAt: result.checkedAt,
  };
}
