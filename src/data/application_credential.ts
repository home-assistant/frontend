import { HomeAssistant } from "../types";

export interface ApplicationCredentialsDomainConfig {
  description_placeholders: string;
}

export interface ApplicationCredentialsConfig {
  integrations: Record<string, ApplicationCredentialsDomainConfig>;
}

export interface ApplicationCredentialsConfigEntry {
  application_credentials_id?: string;
}

export interface ApplicationCredential {
  id: string;
  domain: string;
  client_id: string;
  client_secret: string;
  name: string;
}

export const fetchApplicationCredentialsConfig = async (hass: HomeAssistant) =>
  hass.callWS<ApplicationCredentialsConfig>({
    type: "application_credentials/config",
  });

export const fetchApplicationCredentialsConfigEntry = async (
  hass: HomeAssistant,
  configEntryId: string
) =>
  hass.callWS<ApplicationCredentialsConfigEntry>({
    type: "application_credentials/config_entry",
    config_entry_id: configEntryId,
  });

export const fetchApplicationCredentials = async (hass: HomeAssistant) =>
  hass.callWS<ApplicationCredential[]>({
    type: "application_credentials/list",
  });

export const createApplicationCredential = async (
  hass: HomeAssistant,
  domain: string,
  clientId: string,
  clientSecret: string,
  name?: string
) =>
  hass.callWS<ApplicationCredential>({
    type: "application_credentials/create",
    domain,
    client_id: clientId,
    client_secret: clientSecret,
    name,
  });

export const deleteApplicationCredential = async (
  hass: HomeAssistant,
  applicationCredentialsId: string
) =>
  hass.callWS<void>({
    type: "application_credentials/delete",
    application_credentials_id: applicationCredentialsId,
  });
