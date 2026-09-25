import { computeDomain } from "../../../common/entity/compute_domain";
import type { PictureCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const pictureCardSuggestions: CardSuggestionProvider<PictureCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "image") return null;
      return {
        config: {
          type: "picture",
          image_entity: entityId,
        },
      };
    },
  };
