import { computeDomain } from "../../../common/entity/compute_domain";
import type { AlarmPanelCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const alarmPanelCardSuggestions: CardSuggestionProvider<AlarmPanelCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "alarm_control_panel") return null;
      return {
        config: { type: "alarm-panel", entity: entityId },
      };
    },
  };
