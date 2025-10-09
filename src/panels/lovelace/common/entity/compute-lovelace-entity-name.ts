import type { HassEntity } from "home-assistant-js-websocket";
import {
  DEFAULT_ENTITY_NAME,
  type EntityNameItem,
} from "../../../../common/entity/compute_entity_name_display";
import type { HomeAssistant } from "../../../../types";

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
  stateObj: HassEntity,
  nameConfig: string | EntityNameItem | EntityNameItem[] | undefined
): string =>
  typeof nameConfig === "string"
    ? nameConfig
    : hass.formatEntityName(stateObj, nameConfig || DEFAULT_ENTITY_NAME);
