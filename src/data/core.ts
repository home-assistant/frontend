import { HomeAssistant } from "../types";
import { HassConfig } from "home-assistant-js-websocket";

export interface ConfigUpdateValues {
  location_name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  unit_system: "metric" | "imperial";
  time_zone: string;
}

export const saveCoreConfig = (
  hass: HomeAssistant,
  values: Partial<ConfigUpdateValues>
) =>
  hass.callWS<HassConfig>({
    type: "config/core/update",
    ...values,
  });

export const detectCoreConfig = (hass: HomeAssistant) =>
  hass.callWS<Partial<ConfigUpdateValues>>({
    type: "config/core/detect",
  });
