import { computeDomain } from "../../../common/entity/compute_domain";
import type { PictureEntityCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const pictureEntityCardSuggestions: CardSuggestionProvider<PictureEntityCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "camera") return null;
      return {
        config: {
          type: "picture-entity",
          entity: entityId,
          camera_image: entityId,
        },
      };
    },
  };
