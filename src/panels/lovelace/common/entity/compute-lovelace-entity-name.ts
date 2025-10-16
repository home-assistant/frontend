import type { HassEntity } from "home-assistant-js-websocket";
import {
  DEFAULT_ENTITY_NAME,
  type EntityNameItem,
} from "../../../../common/entity/compute_entity_name_display";
import type { HomeAssistant } from "../../../../types";
import { ensureArray } from "../../../../common/array/ensure-array";

/**
 * Computes the display name for an entity in Lovelace (cards and badges).
 *
 * @param hass - The Home Assistant instance
 * @param stateObj - The entity state object
 * @param nameConfig - The name configuration (string for override, or EntityNameItem[] for structured naming)
 * @returns The computed entity name
 */
export const computeLovelaceEntityName = (
  hass: HomeAssistant,
  stateObj: HassEntity | undefined,
  nameConfig: string | EntityNameItem | EntityNameItem[] | undefined
): string => {
  if (typeof nameConfig === "string") {
    return nameConfig;
  }
  const config = nameConfig || DEFAULT_ENTITY_NAME;
  if (stateObj) {
    return hass.formatEntityName(stateObj, config);
  }
  // If entity is not found, fall back to text parts in config
  // This allows for static names even when the entity is missing
  // e.g. for a card that doesn't require an entity
  const textParts = ensureArray(config)
    .filter((item) => item.type === "text")
    .map((item) => ("text" in item ? item.text : ""));
  if (textParts.length) {
    return textParts.join(" ");
  }
  return "";
};
