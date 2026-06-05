import {
  createErrorResult,
  createLimitedResult,
  createManualResult,
  type DeepSeekBalanceResponse,
  normalizeDeepSeekBalance,
  normalizeOpenRouterKey,
  type OpenRouterKeyResponse,
} from "../domain/metadata";
import type { ApiKeyRecord, MetadataRefreshResult } from "../domain/types";

export async function refreshProviderMetadata(record: ApiKeyRecord): Promise<MetadataRefreshResult> {
  const checkedAt = new Date().toISOString();
  const apiKey = record.keyValue;

  if (!apiKey) {
    return createManualResult("Key value is unavailable until the vault is unlocked.", checkedAt);
  }

  try {
    if (record.provider === "openrouter") {
      const response = await fetchJson<OpenRouterKeyResponse>("https://openrouter.ai/api/v1/key", apiKey);
      return normalizeOpenRouterKey(response, checkedAt);
    }

    if (record.provider === "deepseek") {
      const response = await fetchJson<DeepSeekBalanceResponse>("https://api.deepseek.com/user/balance", apiKey);
      return normalizeDeepSeekBalance(response, checkedAt);
    }

    if (record.provider === "gemini") {
      return createManualResult("Gemini billing and key metadata must be checked in AI Studio or Google Cloud.", checkedAt);
    }

    if (record.provider === "anthropic") {
      return createLimitedResult("Anthropic usage metadata generally requires an organization Admin API key.", checkedAt);
    }

    if (record.provider === "openai") {
      return createLimitedResult("OpenAI key and cost metadata generally requires Admin API access.", checkedAt);
    }

    return createManualResult("Choose a provider before refreshing metadata.", checkedAt);
  } catch (error) {
    return createErrorResult(error, checkedAt);
  }
}

async function fetchJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Provider returned HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}
