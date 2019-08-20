import { HomeAssistant } from "../types";

export interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  connection_class: string;
  supports_options: boolean;
}

export interface ConfigEntrySystemOptions {
  disable_new_entities: boolean;
}

export const getConfigEntries = (hass: HomeAssistant) =>
  hass.callApi<ConfigEntry[]>("GET", "config/config_entries/entry");

export const deleteConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callApi<{
    require_restart: boolean;
  }>("DELETE", `config/config_entries/entry/${configEntryId}`);

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
