import { computeDomain } from "../../../common/entity/compute_domain";
import type { MediaControlCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const mediaControlCardSuggestions: CardSuggestionProvider<MediaControlCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "media_player") return null;
      return {
        config: { type: "media-control", entity: entityId },
      };
    },
  };
