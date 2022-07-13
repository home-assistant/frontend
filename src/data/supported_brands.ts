import type { HomeAssistant } from "../types";

export interface SupportedBrandHandler {
  [key: string]: string;
}

export const getSupportedBrands = (hass: HomeAssistant) =>
  hass.callWS<{ [key: string]: SupportedBrandHandler }>({
    type: "supported_brands",
  });
