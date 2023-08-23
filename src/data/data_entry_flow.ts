import { Connection } from "home-assistant-js-websocket";
import type { HaFormSchema } from "../components/ha-form/types";
import { ConfigEntry } from "./config_entries";

export type FlowType = "config_flow" | "options_flow" | "repair_flow";

export interface DataEntryFlowProgressedEvent {
  type: "data_entry_flow_progressed";
  data: {
    handler: string;
    flow_id: string;
    refresh: boolean;
  };
}

export interface DataEntryFlowProgress {
  flow_id: string;
  handler: string;
  step_id: string;
  context: {
    title_placeholders: Record<string, string>;
    [key: string]: any;
  };
}

export interface DataEntryFlowStepForm {
  type: "form";
  flow_id: string;
  handler: string;
  step_id: string;
  data_schema: HaFormSchema[];
  errors: Record<string, string>;
  description_placeholders?: Record<string, string>;
  last_step: boolean | null;
  preview?: string;
}

export interface DataEntryFlowStepExternal {
  type: "external";
  flow_id: string;
  handler: string;
  step_id: string;
  url: string;
  description_placeholders: Record<string, string>;
}

export interface DataEntryFlowStepCreateEntry {
  type: "create_entry";
  version: number;
  flow_id: string;
  handler: string;
  title: string;
  result?: ConfigEntry;
  description: string;
  description_placeholders?: Record<string, string>;
}

export interface DataEntryFlowStepAbort {
  type: "abort";
  flow_id: string;
  handler: string;
  reason: string;
  description_placeholders?: Record<string, string>;
}

export interface DataEntryFlowStepProgress {
  type: "progress";
  flow_id: string;
  handler: string;
  step_id: string;
  progress_action: string;
  description_placeholders?: Record<string, string>;
}

export interface DataEntryFlowStepMenu {
  type: "menu";
  flow_id: string;
  handler: string;
  step_id: string;
  /** If array, use value to lookup translations in strings.json */
  menu_options: string[] | Record<string, string>;
  description_placeholders?: Record<string, string>;
}

export type DataEntryFlowStep =
  | DataEntryFlowStepForm
  | DataEntryFlowStepExternal
  | DataEntryFlowStepCreateEntry
  | DataEntryFlowStepAbort
  | DataEntryFlowStepProgress
  | DataEntryFlowStepMenu;

export const subscribeDataEntryFlowProgressed = (
  conn: Connection,
  callback: (ev: DataEntryFlowProgressedEvent) => void
) =>
  conn.subscribeEvents<DataEntryFlowProgressedEvent>(
    callback,
    "data_entry_flow_progressed"
  );
