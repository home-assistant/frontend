import type { HomeAssistant } from "../types";

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
  hass: Pick<HomeAssistant, "callWS">,
  itemType: ItemType,
  itemId: string,
  includeDisabledEntities = false
): Promise<RelatedResult> =>
  hass.callWS<RelatedResult>({
    type: "search/related",
    item_type: itemType,
    item_id: itemId,
    ...(includeDisabledEntities ? { include_disabled_entities: true } : {}),
  });
