import { LocalizeFunc } from "../common/translations/localize";
import { HomeAssistant } from "../types";

export interface IntegrationManifest {
  is_built_in: boolean;
  domain: string;
  name: string;
  config_flow: boolean;
  documentation: string;
  issue_tracker?: string;
  dependencies?: string[];
  after_dependencies?: string[];
  codeowners?: string[];
  requirements?: string[];
  ssdp?: Array<{ manufacturer?: string; modelName?: string; st?: string }>;
  zeroconf?: string[];
  homekit?: { models: string[] };
  quality_scale?: string;
}

export const integrationIssuesUrl = (
  domain: string,
  manifest: IntegrationManifest
) =>
  manifest.issue_tracker ||
  `https://github.com/home-assistant/home-assistant/issues?q=is%3Aissue+is%3Aopen+label%3A%22integration%3A+${domain}%22`;

export const domainToName = (localize: LocalizeFunc, domain: string) =>
  localize(`component.${domain}.title`) || domain;

export const fetchIntegrationManifests = (hass: HomeAssistant) =>
  hass.callWS<IntegrationManifest[]>({ type: "manifest/list" });

export const fetchIntegrationManifest = (
  hass: HomeAssistant,
  integration: string
) => hass.callWS<IntegrationManifest>({ type: "manifest/get", integration });
