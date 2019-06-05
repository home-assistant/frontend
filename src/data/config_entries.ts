import { HomeAssistant } from "../types";
import { createCollection } from "home-assistant-js-websocket";
import { debounce } from "../common/util/debounce";
import { LocalizeFunc } from "../common/translations/localize";

export interface DataEntryFlowProgressedEvent {
  type: "data_entry_flow_progressed";
  data: {
    handler: string;
    flow_id: string;
    refresh: boolean;
  };
}

export interface ConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  connection_class: string;
  supports_options: boolean;
}

export interface FieldSchema {
  name: string;
  default?: any;
  optional: boolean;
}

export interface ConfigFlowProgress {
  flow_id: string;
  handler: string;
  context: {
    title_placeholders: { [key: string]: string };
    [key: string]: any;
  };
}

export interface ConfigFlowStepForm {
  type: "form";
  flow_id: string;
  handler: string;
  step_id: string;
  data_schema: FieldSchema[];
  errors: { [key: string]: string };
  description_placeholders: { [key: string]: string };
}

export interface ConfigFlowStepExternal {
  type: "external";
  flow_id: string;
  handler: string;
  step_id: string;
  url: string;
  description_placeholders: { [key: string]: string };
}

export interface ConfigFlowStepCreateEntry {
  type: "create_entry";
  version: number;
  flow_id: string;
  handler: string;
  title: string;
  // Config entry ID
  result: string;
  description: string;
  description_placeholders: { [key: string]: string };
}

export interface ConfigFlowStepAbort {
  type: "abort";
  flow_id: string;
  handler: string;
  reason: string;
  description_placeholders: { [key: string]: string };
}

export type ConfigFlowStep =
  | ConfigFlowStepForm
  | ConfigFlowStepExternal
  | ConfigFlowStepCreateEntry
  | ConfigFlowStepAbort;

export const createConfigFlow = (hass: HomeAssistant, handler: string) =>
  hass.callApi<ConfigFlowStep>("POST", "config/config_entries/flow", {
    handler,
  });

export const fetchConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<ConfigFlowStep>("GET", `config/config_entries/flow/${flowId}`);

export const handleConfigFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: { [key: string]: any }
) =>
  hass.callApi<ConfigFlowStep>(
    "POST",
    `config/config_entries/flow/${flowId}`,
    data
  );

export const deleteConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `config/config_entries/flow/${flowId}`);

export const getConfigFlowsInProgress = (hass: HomeAssistant) =>
  hass.callApi<ConfigFlowProgress[]>("GET", "config/config_entries/flow");

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
  onChange: (flows: ConfigFlowProgress[]) => void
) =>
  createCollection<ConfigFlowProgress[]>(
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
  flow: ConfigFlowProgress
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
