import { HomeAssistant } from "../types";
import { createCollection } from "home-assistant-js-websocket";
import { debounce } from "../common/util/debounce";

export interface FieldSchema {
  name: string;
  default?: any;
  optional: boolean;
}

export interface ConfigFlowProgress {
  flow_id: string;
  handler: string;
  context: { [key: string]: any };
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
