import type { HomeAssistant } from "../types";

export type SupportedBrandHandler = Record<string, string>;

export const getSupportedBrands = (hass: HomeAssistant) =>
  hass.callWS<Record<string, SupportedBrandHandler>>({
    type: "supported_brands",
  });
