import type { ApiKeyRecord } from "./types";

export type TagGroup = {
  tag: string;
  count: number;
  keys: ApiKeyRecord[];
};

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const value = tag.trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function groupKeysByTag(keys: ApiKeyRecord[]): TagGroup[] {
  const groups = new Map<string, ApiKeyRecord[]>();

  for (const key of keys) {
    for (const tag of normalizeTags(key.tags)) {
      const current = groups.get(tag) ?? [];
      current.push(key);
      groups.set(tag, current);
    }
  }

  return Array.from(groups.entries()).map(([tag, groupedKeys]) => ({
    tag,
    count: groupedKeys.length,
    keys: groupedKeys,
  }));
}

export function renameTag(records: ApiKeyRecord[], from: string, to: string): ApiKeyRecord[] {
  const [fromTag] = normalizeTags([from]);
  const [toTag] = normalizeTags([to]);

  if (!fromTag || !toTag) return records;

  return records.map((record) => ({
    ...record,
    tags: normalizeTags(record.tags.map((tag) => (tag.trim().toLowerCase() === fromTag ? toTag : tag))),
  }));
}

