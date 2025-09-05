import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import { generateEntityFilter } from "./entity_filter";

export function computeActiveMediaStates(
  hass: HomeAssistant,
  areaId?: string
): HassEntity[] {
  const area = areaId ? hass.areas[areaId] : undefined;
  if (!area) {
    return [];
  }

  // Get all media_player entities in this area
  const mediaFilter = generateEntityFilter(hass, {
    area: areaId,
    domain: "media_player",
  });

  const mediaEntities = Object.keys(hass.entities).filter(mediaFilter);

  return mediaEntities
    .map((entityId) => hass.states[entityId] as HassEntity | undefined)
    .filter(
      (stateObj): stateObj is HassEntity =>
        stateObj?.state === "playing" || stateObj?.state === "paused"
    );
}
