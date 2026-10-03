import { computeDomain } from "../../../../common/entity/compute_domain";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type {
  PictureEntityCardConfig,
  TileCardConfig,
} from "../../cards/types";

export const computeFavoriteCardConfig = (
  entityId: string
): LovelaceCardConfig => {
  // A camera tile would only show a thumbnail, so give the picture the room.
  if (computeDomain(entityId) === "camera") {
    return {
      type: "picture-entity",
      entity: entityId,
      show_name: false,
      show_state: false,
      grid_options: {
        columns: 6,
        rows: 2,
      },
    } satisfies PictureEntityCardConfig;
  }

  return {
    type: "tile",
    entity: entityId,
    // Favorites come from all over the home, so name the area.
    state_content: ["state", "area_name"],
    show_entity_picture: true,
  } satisfies TileCardConfig;
};
