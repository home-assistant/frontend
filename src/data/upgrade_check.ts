import {
  mdiAlertOutline,
  mdiArchiveOutline,
  mdiMedalOutline,
  mdiStarOutline,
} from "@mdi/js";
import type { HomeAssistant } from "../types";

// Page with the full upgrade check.
export const UPGRADE_CHECK_PATH = "/config/updates/upgrade-check";

// Hash on its page that scrolls to the upgrade check card.
export const UPGRADE_CHECK_ANCHOR = "upgrade-check";

// Hashes on its page that open and scroll to a category, or one group
// in it; general changes have no domains.
export const upgradeCheckCategoryAnchor = (
  category: UpgradeCheckCategoryKey
): string => `${UPGRADE_CHECK_ANCHOR}-${category}`;

export const upgradeCheckGroupAnchor = (
  category: UpgradeCheckCategoryKey,
  domains: string[]
): string =>
  `${upgradeCheckCategoryAnchor(category)}-${domains.join("-") || "general"}`;

// Error code when the release notes cannot be read, e.g. while offline.
export const UPGRADE_CHECK_UNAVAILABLE = "release_notes_unavailable";

export type UpgradeCheckCategoryKey =
  "breaking" | "noteworthy" | "quality_scale" | "removed";

export type UpgradeCheckTier = "bronze" | "silver" | "gold" | "platinum";

// Icon and tone of each category, like the status icons of update history.
export const UPGRADE_CHECK_CATEGORY_ICONS: Record<
  UpgradeCheckCategoryKey,
  { icon: string; tone: "warning" | "primary" | "success" | "neutral" }
> = {
  breaking: { icon: mdiAlertOutline, tone: "warning" },
  noteworthy: { icon: mdiStarOutline, tone: "primary" },
  quality_scale: { icon: mdiMedalOutline, tone: "success" },
  removed: { icon: mdiArchiveOutline, tone: "neutral" },
};

export interface UpgradeCheckLink {
  label: string;
  url: string;
}

export interface UpgradeCheckItem {
  title: string;
  text: string | null;
  tier: UpgradeCheckTier | null;
  // GitHub usernames thanked for a quality scale achievement.
  credits: string[];
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
  // Quality scale lines have no text of their own; their credit line is unique.
  const text =
    category === "quality_scale" ? `${item.title}, thanks to` : item.text;
  const words = (text ?? "")
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
