import { HomeAssistant } from "../types";

export interface FieldSchema {
  name: string;
  default?: any;
  optional: boolean;
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
  data: any;
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
