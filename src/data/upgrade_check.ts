import type { HomeAssistant } from "../types";

// Hash on /config/updates that scrolls to the upgrade check card.
export const UPGRADE_CHECK_ANCHOR = "upgrade-check";

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
