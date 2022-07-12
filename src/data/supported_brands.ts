import { HomeAssistant } from "../types";

export const getSupportedBrands = (hass: HomeAssistant) =>
  hass.callWS({ type: "supported_brands" });
