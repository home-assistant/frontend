import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import type { IntegrationManifest, IntegrationType } from "./integration";

export interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state:
    | "loaded"
    | "setup_error"
    | "migration_error"
    | "setup_retry"
    | "not_loaded"
    | "failed_unload"
    | "setup_in_progress";
  supports_options: boolean;
  supports_remove_device: boolean;
  supports_unload: boolean;
  pref_disable_new_entities: boolean;
  pref_disable_polling: boolean;
  disabled_by: "user" | null;
  reason: string | null;
}

export type ConfigEntryMutableParams = Partial<
  Pick<
    ConfigEntry,
    "title" | "pref_disable_new_entities" | "pref_disable_polling"
  >
>;

// https://github.com/home-assistant/core/blob/2286dea636fda001f03433ba14d7adbda43979e5/homeassistant/config_entries.py#L81
export const ERROR_STATES: ConfigEntry["state"][] = [
  "migration_error",
  "setup_error",
  "setup_retry",
];

// https://github.com/home-assistant/core/blob/2286dea636fda001f03433ba14d7adbda43979e5/homeassistant/config_entries.py#L81
export const RECOVERABLE_STATES: ConfigEntry["state"][] = [
  "not_loaded",
  "loaded",
  "setup_error",
  "setup_retry",
];

export interface ConfigEntryUpdate {
  // null means no update as is the current state
  type: null | "added" | "removed" | "updated";
  entry: ConfigEntry;
}

export const subscribeConfigEntries = (
  hass: HomeAssistant,
  callbackFunction: (message: ConfigEntryUpdate[]) => void,
  filters?: {
    type?: IntegrationType[];
    domain?: string;
  }
): Promise<UnsubscribeFunc> => {
  const params: any = {
    type: "config_entries/subscribe",
  };
  if (filters && filters.type) {
    params.type_filter = filters.type;
  }
  return hass.connection.subscribeMessage<ConfigEntryUpdate[]>(
    (message) => callbackFunction(message),
    params
  );
};

export const getConfigEntries = (
  hass: HomeAssistant,
  filters?: {
    type?: IntegrationType[];
    domain?: string;
  }
): Promise<ConfigEntry[]> => {
  const params: any = {};
  if (filters) {
    if (filters.type) {
      params.type_filter = filters.type;
    }
    if (filters.domain) {
      params.domain = filters.domain;
    }
  }
  return hass.callWS<ConfigEntry[]>({
    type: "config_entries/get",
    ...params,
  });
};

export const getConfigEntry = (hass: HomeAssistant, configEntryId: string) =>
  hass.callWS<{ config_entry: ConfigEntry }>({
    type: "config_entries/get_single",
    entry_id: configEntryId,
  });

export const updateConfigEntry = (
  hass: HomeAssistant,
  configEntryId: string,
  updatedValues: ConfigEntryMutableParams
) =>
  hass.callWS<{ require_restart: boolean; config_entry: ConfigEntry }>({
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

export interface DisableConfigEntryResult {
  require_restart: boolean;
}

export const disableConfigEntry = (
  hass: HomeAssistant,
  configEntryId: string
) =>
  hass.callWS<DisableConfigEntryResult>({
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

export const sortConfigEntries = (
  configEntries: ConfigEntry[],
  manifestLookup: { [domain: string]: IntegrationManifest }
): ConfigEntry[] => {
  const sortedConfigEntries = [...configEntries];

  const getScore = (entry: ConfigEntry) => {
    const manifest = manifestLookup[entry.domain] as
      | IntegrationManifest
      | undefined;
    const isHelper = manifest?.integration_type === "helper";
    return isHelper ? -1 : 1;
  };

  const configEntriesCompare = (a: ConfigEntry, b: ConfigEntry) =>
    getScore(b) - getScore(a);

  return sortedConfigEntries.sort(configEntriesCompare);
};
