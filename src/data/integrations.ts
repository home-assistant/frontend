import { HomeAssistant } from "../types";

export type IotStandards = "zwave" | "zigbee" | "homekit" | "matter";

export interface Integration {
  name?: string;
  config_flow?: boolean;
  integrations?: Integrations;
  iot_standards?: IotStandards[];
  is_built_in?: boolean;
  iot_class?: string;
}

export interface Integrations {
  [domain: string]: Integration;
}

export interface IntegrationDescriptions {
  core: {
    integration: Integrations;
    hardware: Integrations;
    helper: Integrations;
    translated_name: string[];
  };
  custom: {
    integration: Integrations;
    hardware: Integrations;
    helper: Integrations;
  };
}

export const getIntegrationDescriptions = (
  hass: HomeAssistant
): Promise<IntegrationDescriptions> =>
  hass.callWS<IntegrationDescriptions>({
    type: "integration/descriptions",
  });
