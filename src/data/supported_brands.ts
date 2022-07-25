import { SupportedBrandObj } from "../dialogs/config-flow/step-flow-pick-handler";
import type { HomeAssistant } from "../types";

export type SupportedBrandHandler = Record<string, string>;

export const getSupportedBrands = (hass: HomeAssistant) =>
  hass.callWS<Record<string, SupportedBrandHandler>>({
    type: "supported_brands",
  });

export const getSupportedBrandsLookup = (
  supportedBrands: Record<string, SupportedBrandHandler>
): Record<string, Partial<SupportedBrandObj>> => {
  const supportedBrandsIntegrations: Record<
    string,
    Partial<SupportedBrandObj>
  > = {};
  for (const [d, domainBrands] of Object.entries(supportedBrands)) {
    for (const [slug, name] of Object.entries(domainBrands)) {
      supportedBrandsIntegrations[slug] = {
        name,
        supported_flows: [d],
      };
    }
  }
  return supportedBrandsIntegrations;
};
