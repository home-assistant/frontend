import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../../../../common/array/ensure-array";
import type { EntityNameItem } from "../../../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import type { HomeAssistant } from "../../../../types";

/**
 * Computes the display name for an entity in Lovelace (cards and badges).
 *
 * @param hass - The Home Assistant instance
 * @param stateObj - The entity state object
 * @param config - The name configuration (string for override, or EntityNameItem[] for structured naming)
 * @returns The computed entity name
 */
export const computeLovelaceEntityName = (
  hass: HomeAssistant,
  stateObj: HassEntity | undefined,
  config: string | EntityNameItem | EntityNameItem[] | undefined
): string => {
  // If no config is provided, fall back to the default state name
  if (!config) {
    return stateObj ? computeStateName(stateObj) : "";
  }
  if (typeof config !== "object") {
    return String(config);
  }
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
