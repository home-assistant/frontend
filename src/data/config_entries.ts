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

export const getConfigEntries = (hass: HomeAssistant) =>
  hass.callApi<ConfigEntry[]>("GET", "config/config_entries/entry");

export const deleteConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callApi<{
    require_restart: boolean;
  }>("DELETE", `config/config_entries/entry/${configEntryId}`);
