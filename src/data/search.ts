import { HomeAssistant } from "../types";

export interface RelatedResult {
  area?: string[];
  automation?: string[];
  automation_blueprint?: string[];
  config_entry?: string[];
  device?: string[];
  entity?: string[];
  group?: string[];
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
  | "group"
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
