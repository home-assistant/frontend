import memoizeOne from "memoize-one";
import type { HomeAssistant } from "../types";
import { caseInsensitiveStringCompare } from "../common/string/compare";

export interface RelatedResult {
  area?: string[];
  automation?: string[];
  automation_blueprint?: string[];
  config_entry?: string[];
  device?: string[];
  entity?: string[];
  group?: string[];
  integration?: string[];
  scene?: string[];
  script?: string[];
  script_blueprint?: string[];
}

export const SearchableDomains = new Set([
  "automation",
  "script",
  "scene",
  "group",
]);

export type ItemType =
  | "area"
  | "automation"
  | "config_entry"
  | "device"
  | "entity"
  | "floor"
  | "group"
  | "label"
  | "scene"
  | "script"
  | "automation_blueprint"
  | "script_blueprint";

export const findRelated = (
  hass: HomeAssistant,
  itemType: ItemType,
  itemId: string
): Promise<RelatedResult> =>
  hass.callWS({
    type: "search/related",
    item_type: itemType,
    item_id: itemId,
  });

export const sortRelated = memoizeOne(
  (hass: HomeAssistant, entityIds: string[]) =>
    entityIds
      .map((entityId) => hass.states[entityId])
      .filter((entity) => entity)
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a.attributes.friendly_name ?? a.entity_id,
          b.attributes.friendly_name ?? b.entity_id,
          hass.language
        )
      )
);
