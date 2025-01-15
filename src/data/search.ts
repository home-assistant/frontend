import type { HassEntity } from "home-assistant-js-websocket";
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

export const findRelated = async (
  hass: HomeAssistant,
  itemType: ItemType,
  itemId: string
): Promise<RelatedResult> => {
  const related = await hass.callWS<RelatedResult>({
    type: "search/related",
    item_type: itemType,
    item_id: itemId,
  });

  Object.keys(related).forEach((key) => {
    related[key] = related[key]
      .map((id: string) => hass.states[id])
      .filter(Boolean)
      .sort((a: HassEntity, b: HassEntity) =>
        caseInsensitiveStringCompare(
          a.attributes.friendly_name ?? a.entity_id,
          b.attributes.friendly_name ?? b.entity_id,
          hass.language
        )
      )
      .map((entity: HassEntity) => entity.entity_id);
  });

  return related;
};
