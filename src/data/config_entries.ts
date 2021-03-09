import { HomeAssistant } from "../types";

export interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  connection_class: string;
  supports_options: boolean;
  supports_unload: boolean;
  disabled_by: string | null;
}

export interface ConfigEntryMutableParams {
  title: string;
}

export interface ConfigEntrySystemOptions {
  disable_new_entities: boolean;
}

export const getConfigEntries = (hass: HomeAssistant) =>
  hass.callApi<ConfigEntry[]>("GET", "config/config_entries/entry");

export const updateConfigEntry = (
  hass: HomeAssistant,
  configEntryId: string,
  updatedValues: Partial<ConfigEntryMutableParams>
) =>
  hass.callWS<ConfigEntry>({
    type: "config_entries/update",
    entry_id: configEntryId,
    ...updatedValues,
  });

export const deleteConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callApi<{
    require_restart: boolean;
  }>("DELETE", `config/config_entries/entry/${configEntryId}`);

export const reloadConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callApi<{
    require_restart: boolean;
  }>("POST", `config/config_entries/entry/${configEntryId}/reload`);

export const disableConfigEntry = (
  hass: HomeAssistant,
  configEntryId: string
) =>
  hass.callWS<{
    require_restart: boolean;
  }>({
    type: "config_entries/disable",
    entry_id: configEntryId,
    disabled_by: "user",
  });

export const enableConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callWS<{
    require_restart: boolean;
  }>({
    type: "config_entries/disable",
    entry_id: configEntryId,
    disabled_by: null,
  });

export const getConfigEntrySystemOptions = (
  hass: HomeAssistant,
  configEntryId: string
) =>
  hass.callWS<ConfigEntrySystemOptions>({
    type: "config_entries/system_options/list",
    entry_id: configEntryId,
  });

export const updateConfigEntrySystemOptions = (
  hass: HomeAssistant,
  configEntryId: string,
  params: Partial<ConfigEntrySystemOptions>
) =>
  hass.callWS({
    type: "config_entries/system_options/update",
    entry_id: configEntryId,
    ...params,
  });
