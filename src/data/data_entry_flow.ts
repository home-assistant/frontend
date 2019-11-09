export interface DataEntryFlowProgressedEvent {
  type: "data_entry_flow_progressed";
  data: {
    handler: string;
    flow_id: string;
    refresh: boolean;
  };
}

export interface FieldSchema {
  name: string;
  default?: any;
  optional: boolean;
}

export interface DataEntryFlowProgress {
  flow_id: string;
  handler: string;
  context: {
    title_placeholders: { [key: string]: string };
    [key: string]: any;
  };
}

export interface DataEntryFlowStepForm {
  type: "form";
  flow_id: string;
  handler: string;
  step_id: string;
  data_schema: FieldSchema[];
  errors: { [key: string]: string };
  description_placeholders: { [key: string]: string };
  labels: { [key: string]: string };
}

export interface DataEntryFlowStepExternal {
  type: "external";
  flow_id: string;
  handler: string;
  step_id: string;
  url: string;
  description_placeholders: { [key: string]: string };
  labels: { [key: string]: string };
}

export interface DataEntryFlowStepCreateEntry {
  type: "create_entry";
  version: number;
  flow_id: string;
  handler: string;
  title: string;
  // Config entry ID
  result: string;
  description: string;
  description_placeholders: { [key: string]: string };
  labels: { [key: string]: string };
}

export interface DataEntryFlowStepAbort {
  type: "abort";
  flow_id: string;
  handler: string;
  reason: string;
  description_placeholders: { [key: string]: string };
}

export type DataEntryFlowStep =
  | DataEntryFlowStepForm
  | DataEntryFlowStepExternal
  | DataEntryFlowStepCreateEntry
  | DataEntryFlowStepAbort;
