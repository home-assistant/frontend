import { mdiContentSave, mdiMedal, mdiTrophy } from "@mdi/js";
import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";
import type { LocalizeKeys } from "../common/translations/localize";

/**
 * Map integration quality scale to icon and translation key.
 */
export const QUALITY_SCALE_MAP: Record<
  string,
  { icon: string; translationKey: LocalizeKeys }
> = {
  bronze: {
    icon: mdiMedal,
    translationKey: "ui.panel.config.integrations.config_entry.bronze_quality",
  },
  silver: {
    icon: mdiMedal,
    translationKey: "ui.panel.config.integrations.config_entry.silver_quality",
  },
  gold: {
    icon: mdiMedal,
    translationKey: "ui.panel.config.integrations.config_entry.gold_quality",
  },
  platinum: {
    icon: mdiTrophy,
    translationKey:
      "ui.panel.config.integrations.config_entry.platinum_quality",
  },
  internal: {
    icon: mdiHomeAssistant,
    translationKey:
      "ui.panel.config.integrations.config_entry.internal_integration",
  },
  legacy: {
    icon: mdiContentSave,
    translationKey:
      "ui.panel.config.integrations.config_entry.legacy_integration",
  },
};
