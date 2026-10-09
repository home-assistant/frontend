import type { HomeAssistant } from "../types";
import type { IntegrationType } from "./integration";

export type IotStandards = "zwave" | "zigbee" | "homekit" | "matter";

export interface Integration {
  integration_type: IntegrationType;
  name?: string;
  config_flow?: boolean;
  iot_standards?: IotStandards[];
  iot_class?: string;
  supported_by?: string;
  is_built_in?: boolean;
  overwrites_built_in?: boolean;
  single_config_entry?: boolean;
}

export type Integrations = Record<string, Integration>;

export interface Brand {
  name?: string;
  integrations?: Integrations;
  iot_standards?: IotStandards[];
  is_built_in?: boolean;
  overwrites_built_in?: boolean;
}

export type Brands = Record<string, Integration | Brand>;

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

export interface IntegrationFilter {
  domains: string[];
}

export const getIntegrationDescriptions = (
  hass: HomeAssistant
): Promise<IntegrationDescriptions> =>
  hass.callWS<IntegrationDescriptions>({
    type: "integration/descriptions",
  });

export const filterIntegrationsByDomains = <T extends Brands>(
  integrations: T,
  domains: string[]
): T => {
  const filtered: Brands = {};
  for (const [domain, integration] of Object.entries(integrations)) {
    if ("integration_type" in integration) {
      if (domains.includes(domain)) {
        filtered[domain] = integration;
      }
      continue;
    }
    const subIntegrations = Object.entries(
      integration.integrations ?? {}
    ).filter(([subDomain]) => domains.includes(subDomain));
    if (subIntegrations.length) {
      const { iot_standards: _iotStandards, ...brand } = integration;
      filtered[domain] = {
        ...brand,
        integrations: Object.fromEntries(subIntegrations),
      };
    }
  }
  return filtered as T;
};

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
