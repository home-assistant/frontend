import { HomeAssistant } from "../types";
import { createCollection } from "home-assistant-js-websocket";
import { debounce } from "../common/util/debounce";
import { LocalizeFunc } from "../common/translations/localize";
import { DataEntryFlowStep, DataEntryFlowProgress } from "./data_entry_flow";

export interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  connection_class: string;
  supports_options: boolean;
}

export const createConfigFlow = (hass: HomeAssistant, handler: string) =>
  hass.callApi<DataEntryFlowStep>("POST", "config/config_entries/flow", {
    handler,
  });

export const fetchConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>(
    "GET",
    `config/config_entries/flow/${flowId}`
  );

export const handleConfigFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: { [key: string]: any }
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    `config/config_entries/flow/${flowId}`,
    data
  );

export const deleteConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `config/config_entries/flow/${flowId}`);

export const getConfigFlowsInProgress = (hass: HomeAssistant) =>
  hass.callApi<DataEntryFlowProgress[]>("GET", "config/config_entries/flow");

export const getConfigFlowHandlers = (hass: HomeAssistant) =>
  hass.callApi<string[]>("GET", "config/config_entries/flow_handlers");

const fetchConfigFlowInProgress = (conn) =>
  conn.sendMessagePromise({
    type: "config/entity_registry/list",
  });

const subscribeConfigFlowInProgressUpdates = (conn, store) =>
  debounce(
    conn.subscribeEvents(
      () =>
        fetchConfigFlowInProgress(conn).then((flows) =>
          store.setState(flows, true)
        ),
      500,
      true
    ),
    "config_entry_discovered"
  );

export const subscribeConfigFlowInProgress = (
  hass: HomeAssistant,
  onChange: (flows: DataEntryFlowProgress[]) => void
) =>
  createCollection<DataEntryFlowProgress[]>(
    "_configFlowProgress",
    fetchConfigFlowInProgress,
    subscribeConfigFlowInProgressUpdates,
    hass.connection,
    onChange
  );

export const getConfigEntries = (hass: HomeAssistant) =>
  hass.callApi<ConfigEntry[]>("GET", "config/config_entries/entry");

export const localizeConfigFlowTitle = (
  localize: LocalizeFunc,
  flow: DataEntryFlowProgress
) => {
  const placeholders = flow.context.title_placeholders || {};
  const placeholderKeys = Object.keys(placeholders);
  if (placeholderKeys.length === 0) {
    return localize(`component.${flow.handler}.config.title`);
  }
  const args: string[] = [];
  placeholderKeys.forEach((key) => {
    args.push(key);
    args.push(placeholders[key]);
  });
  return localize(`component.${flow.handler}.config.flow_title`, ...args);
};

// Options flow

export const createOptionsFlow = (hass: HomeAssistant, handler: string) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    "config/config_entries/options/flow",
    {
      handler,
    }
  );

export const fetchOptionsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>(
    "GET",
    `config/config_entries/options/flow/${flowId}`
  );

export const handleOptionsFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: { [key: string]: any }
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    `config/config_entries/options/flow/${flowId}`,
    data
  );

export const deleteOptionsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `config/config_entries/options/flow/${flowId}`);
