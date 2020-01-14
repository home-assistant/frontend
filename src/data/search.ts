import { HomeAssistant } from "../types";

interface RelatedResult {
  area?: string[];
  automation?: string[];
  config_entry?: string[];
  device?: string[];
  entity?: string[];
  group?: string[];
  scene?: string[];
  script?: string[];
}

type ItemType =
  | "area"
  | "automation"
  | "config_entry"
  | "device"
  | "entity"
  | "group"
  | "scene"
  | "script";

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
