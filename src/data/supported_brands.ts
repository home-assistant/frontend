import { SupportedBrandHandler } from "../dialogs/config-flow/show-dialog-data-entry-flow";
import { HomeAssistant } from "../types";

export const getSupportedBrands = (hass: HomeAssistant) =>
  hass.callWS<{ [key: string]: SupportedBrandHandler }>({
    type: "supported_brands",
  });
