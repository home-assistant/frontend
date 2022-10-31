import { HomeAssistant } from "../types";
import { IntegrationType } from "./integration";

export type IotStandards = "zwave" | "zigbee" | "homekit" | "matter";

export interface Integration {
  integration_type: IntegrationType;
  name?: string;
  config_flow?: boolean;
  iot_standards?: IotStandards[];
  iot_class?: string;
  supported_by?: string;
  is_built_in?: boolean;
}

export interface Integrations {
  [domain: string]: Integration;
}

export interface Brand {
  name?: string;
  integrations?: Integrations;
  iot_standards?: IotStandards[];
  is_built_in?: boolean;
}

export interface Brands {
  [domain: string]: Integration | Brand;
}

export interface IntegrationDescriptions {
  core: {
    integration: Brands;
    helper: Integrations;
    translated_name: string[];
  };
  custom: {
    integration: Brands;
    helper: Integrations;
  };
}

export const getIntegrationDescriptions = (
  hass: HomeAssistant
): Promise<IntegrationDescriptions> =>
  hass.callWS<IntegrationDescriptions>({
    type: "integration/descriptions",
  });

export const findIntegration = (
  integrations: Brands | undefined,
  domain: string
): Integration | undefined => {
  if (!integrations) {
    return undefined;
  }
  if (domain in integrations) {
    const integration = integrations[domain];
    if ("integration_type" in integration) {
      return integration;
    }
  }
  for (const integration of Object.values(integrations)) {
    if (
      "integrations" in integration &&
      integration.integrations &&
      domain in integration.integrations
    ) {
      return integration.integrations[domain];
    }
  }
  return undefined;
};
