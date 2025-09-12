import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

export interface ExtractFromTargetResult {
  missing_areas: string[];
  missing_devices: string[];
  missing_floors: string[];
  missing_labels: string[];
  referenced_areas: string[];
  referenced_devices: string[];
  referenced_entities: string[];
}

export const extractFromTarget = async (
  hass: HomeAssistant,
  target: HassServiceTarget
) =>
  hass.callWS<ExtractFromTargetResult>({
    type: "extract_from_target",
    target,
  });
