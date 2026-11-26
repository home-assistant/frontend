import { computeDomain } from "../common/entity/compute_domain";
import type { HomeAssistant } from "../types";

// Page with every breaking change and improvement since the running version.
export const UPGRADE_CHECK_PATH = "/config/updates/upgrade-check";

// Error code when the release notes cannot be read, e.g. while offline.
export const UPGRADE_CHECK_UNAVAILABLE = "release_notes_unavailable";

export type UpgradeCheckCategoryKey =
  "breaking" | "noteworthy" | "quality_scale" | "removed";

export type UpgradeCheckTier = "bronze" | "silver" | "gold" | "platinum";

export interface UpgradeCheckLink {
  label: string;
  url: string;
}

export interface UpgradeCheckItem {
  // Unique within its release, not across releases.
  id: string;
  title: string;
  text: string | null;
  // First sentence of the text, as one plain line.
  summary: string | null;
  tier: UpgradeCheckTier | null;
  // GitHub usernames of the authors, or those thanked for a quality scale
  // achievement.
  authors: string[];
  prs: UpgradeCheckLink[];
  // Release the item is from, and its release notes.
  version: string;
  url: string;
  domains: string[];
  scope: "domains" | "global" | "mentions";
}

export interface UpgradeCheckCategory {
  key: UpgradeCheckCategoryKey;
  count: number;
  items: UpgradeCheckItem[];
  related: UpgradeCheckItem[];
}

export interface UpgradeCheckDigest {
  running: string;
  // Null when no core update is pending.
  target: string | null;
  // The update entity that offers the core update.
  entity_id: string | null;
  releases: { version: string; url: string }[];
  categories: UpgradeCheckCategory[];
}

export const fetchUpgradeCheckDigest = (hass: Pick<HomeAssistant, "callWS">) =>
  hass.callWS<UpgradeCheckDigest>({
    type: "homeassistant_upgrade_check/digest",
  });

// The Core update entity, offered by the Supervisor's core device, so it is
// known when the release notes cannot be read. A leftover registry entry has
// no usable state, so it is skipped.
export const findCoreUpdateEntityId = (
  hass: Pick<HomeAssistant, "entities" | "devices" | "states">
): string | undefined =>
  Object.values(hass.entities).find(
    (entry) =>
      computeDomain(entry.entity_id) === "update" &&
      ![undefined, "unavailable"].includes(
        hass.states[entry.entity_id]?.state
      ) &&
      // Mock: the upgrade check's own core update, where there is no Supervisor.
      (entry.platform === "homeassistant_upgrade_check" ||
        (entry.platform === "hassio" &&
          Boolean(
            entry.device_id &&
            hass.devices[entry.device_id]?.identifiers.some(
              ([domain, id]) => domain === "hassio" && id === "core"
            )
          )))
  )?.entity_id;

export const upgradeCheckItems = (
  digest: UpgradeCheckDigest,
  key: UpgradeCheckCategoryKey
): UpgradeCheckItem[] =>
  digest.categories.find((category) => category.key === key)?.items ?? [];

// One row per integration you use, or set of integrations a change covers
// together, or general change.
export interface UpgradeCheckBreakingRow {
  category: UpgradeCheckCategoryKey;
  // Hash on the page that opens and scrolls to the row.
  anchor: string;
  // Integration domains; empty for a general change.
  domains: string[];
  removed: boolean;
  items: UpgradeCheckItem[];
}

export interface UpgradeCheckBreakingCounts {
  // Breaking changes, general ones included.
  changes: number;
  // Distinct integrations the changes cover.
  integrations: number;
  general: number;
}

export const upgradeCheckBreakingCounts = (
  rows: UpgradeCheckBreakingRow[]
): UpgradeCheckBreakingCounts => ({
  changes: rows.reduce((count, row) => count + row.items.length, 0),
  integrations: new Set(rows.flatMap((row) => row.domains)).size,
  general: rows.filter((row) => !row.domains.length).length,
});

// Integrations you use that a release removes. Not a breaking change: they
// stop working altogether, so they are listed on their own.
export const upgradeCheckRemovedRows = (
  digest: UpgradeCheckDigest
): UpgradeCheckBreakingRow[] =>
  upgradeCheckItems(digest, "removed").map((item) => ({
    category: "removed",
    anchor: `removed-${item.domains.join("-")}`,
    domains: item.domains,
    removed: true,
    items: [item],
  }));

/**
 * Breaking changes for your setup: integrations in release notes order, which
 * puts the most used first, then general changes.
 */
export const upgradeCheckBreakingRows = (
  digest: UpgradeCheckDigest
): UpgradeCheckBreakingRow[] => {
  const integrations = new Map<string, UpgradeCheckBreakingRow>();
  const general: UpgradeCheckBreakingRow[] = [];
  for (const item of upgradeCheckItems(digest, "breaking")) {
    if (item.scope === "global") {
      general.push({
        category: "breaking",
        anchor: `breaking-general-${item.version}-${item.id}`,
        domains: [],
        removed: false,
        items: [item],
      });
      continue;
    }
    const key = item.domains.join("-");
    if (!integrations.has(key)) {
      integrations.set(key, {
        category: "breaking",
        anchor: `breaking-${key}`,
        domains: item.domains,
        removed: false,
        items: [],
      });
    }
    integrations.get(key)!.items.push(item);
  }
  return [...integrations.values(), ...general];
};

// Improvements for your integrations, one row per integration.
export const upgradeCheckImprovementRows = (
  digest: UpgradeCheckDigest
): UpgradeCheckBreakingRow[] => {
  const rows = new Map<string, UpgradeCheckBreakingRow>();
  for (const item of upgradeCheckItems(digest, "noteworthy")) {
    const domains = item.domains.slice(0, 1);
    const key = domains[0] ?? item.id;
    if (!rows.has(key)) {
      rows.set(key, {
        category: "noteworthy",
        anchor: `improvement-${key}`,
        domains,
        removed: false,
        items: [],
      });
    }
    rows.get(key)!.items.push(item);
  }
  return [...rows.values()];
};

// Quality scale tier your integrations reached, one row per integration.
export const upgradeCheckQualityScaleRows = (
  digest: UpgradeCheckDigest
): UpgradeCheckBreakingRow[] =>
  upgradeCheckItems(digest, "quality_scale").map((item) => ({
    category: "quality_scale",
    anchor: `quality-scale-${item.domains.join("-") || item.id}`,
    domains: item.domains,
    removed: false,
    items: [item],
  }));

// Section anchors of the release notes post for each category.
const SECTION_ANCHORS: Record<UpgradeCheckCategoryKey, string> = {
  breaking: "backward-incompatible-changes",
  noteworthy: "noteworthy-improvements-to-existing-integrations",
  quality_scale: "integration-quality-scale-achievements",
  removed: "farewell-to-the-following",
};

// How many words of an item's text identify it in the post.
const FRAGMENT_WORDS = 6;

/**
 * Link to an item in its release notes post. Browsers that support text
 * fragments open and scroll to the item itself; others go to its section.
 */
export const upgradeCheckItemLink = (
  category: UpgradeCheckCategoryKey,
  item: UpgradeCheckItem
): string => {
  const words = (item.text ?? "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Only bold and code markers: underscores and stars also occur in names.
    .replace(/\*\*|`/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, FRAGMENT_WORDS);
  const anchor = `${item.url}#${SECTION_ANCHORS[category]}`;
  if (!words.length) {
    return anchor;
  }
  // Dashes and commas separate the parts of a text directive, so encode them.
  const directive = encodeURIComponent(words.join(" ")).replace(/-/g, "%2D");
  return `${anchor}:~:text=${directive}`;
};
