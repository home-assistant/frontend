export interface CustomShortcutItem {
  type: "custom";
  path: string;
  label?: string;
  icon?: string;
  color?: string;
}

export interface SummaryShortcutItem {
  type: "summary";
  key: string;
  hidden?: boolean;
}

export type ShortcutItem = CustomShortcutItem | SummaryShortcutItem;

export const DEFAULT_SUMMARY_KEYS = [
  "light",
  "climate",
  "security",
  "media_players",
  "maintenance",
  "weather",
  "energy",
] as const;

export type DefaultSummaryKey = (typeof DEFAULT_SUMMARY_KEYS)[number];

const DEFAULT_SUMMARY_KEYS_SET: ReadonlySet<string> = new Set(
  DEFAULT_SUMMARY_KEYS
);

// Built-in summary keys missing from the saved list are appended in
// DEFAULT_SUMMARY_KEYS order; summary keys no longer in the defaults are
// dropped.
export function resolveShortcutItems(
  saved: ShortcutItem[] | undefined
): ShortcutItem[] {
  const result: ShortcutItem[] = [];
  const seenSummaryKeys = new Set<string>();
  for (const item of saved || []) {
    if (item.type === "summary") {
      if (!DEFAULT_SUMMARY_KEYS_SET.has(item.key)) continue;
      if (seenSummaryKeys.has(item.key)) continue;
      seenSummaryKeys.add(item.key);
    }
    result.push(item);
  }
  for (const key of DEFAULT_SUMMARY_KEYS) {
    if (!seenSummaryKeys.has(key)) {
      result.push({ type: "summary", key });
    }
  }
  return result;
}
