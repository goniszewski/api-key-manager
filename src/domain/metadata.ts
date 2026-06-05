import type { MetadataRefreshResult } from "./types";

export type OpenRouterKeyResponse = {
  data?: {
    label?: string;
    limit?: number | null;
    limit_remaining?: number | null;
    usage?: number;
    usage_daily?: number;
    usage_weekly?: number;
    usage_monthly?: number;
    is_free_tier?: boolean;
    expires_at?: string | null;
  };
};

export type DeepSeekBalanceResponse = {
  is_available?: boolean;
  balance_infos?: Array<{
    currency: string;
    total_balance: string;
    granted_balance: string;
    topped_up_balance: string;
  }>;
};

export function normalizeOpenRouterKey(response: OpenRouterKeyResponse, checkedAt: string): MetadataRefreshResult {
  const data = response.data ?? {};
  const monthlyUsage = data.usage_monthly ?? data.usage ?? 0;

  return {
    status: "ok",
    checkedAt,
    error: null,
    metadata: {
      balanceLabel:
        typeof data.limit_remaining === "number" ? `${formatUsd(data.limit_remaining)} remaining` : "Unlimited",
      usageLabel: `${formatUsd(monthlyUsage)} this month`,
      limitLabel: typeof data.limit === "number" ? `${formatUsd(data.limit)} limit` : "No credit limit",
      expiresAt: data.expires_at ?? null,
      raw: response,
    },
  };
}

export function normalizeDeepSeekBalance(response: DeepSeekBalanceResponse, checkedAt: string): MetadataRefreshResult {
  const primaryBalance = response.balance_infos?.[0];
  const balanceLabel = primaryBalance
    ? `${primaryBalance.currency} ${primaryBalance.total_balance}`
    : "No balance returned";

  return {
    status: response.is_available === false ? "limited" : "ok",
    checkedAt,
    error: response.is_available === false ? "DeepSeek reports insufficient balance." : null,
    metadata: {
      balanceLabel,
      limitLabel: response.is_available === false ? "Unavailable" : "Available",
      raw: response,
    },
  };
}

export function createManualResult(message: string, checkedAt: string): MetadataRefreshResult {
  return {
    status: "manual",
    checkedAt,
    metadata: null,
    error: message,
  };
}

export function createLimitedResult(message: string, checkedAt: string): MetadataRefreshResult {
  return {
    status: "limited",
    checkedAt,
    metadata: null,
    error: message,
  };
}

export function createErrorResult(error: unknown, checkedAt: string): MetadataRefreshResult {
  return {
    status: "error",
    checkedAt,
    metadata: null,
    error: error instanceof Error ? error.message : "Metadata refresh failed.",
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
