export interface PickerTarget extends EventTarget {
  selected: number;
}

export interface ItemSelectedEvent {
  target?: PickerTarget;
}

export interface Cluster {
  name: string;
  id: number;
  type: string;
}

export interface Attribute {
  name: string;
  id: number;
}

export interface Command {
  name: string;
  id: number;
  type: string;
}

export interface SetAttributeServiceData {
  entity_id: string;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  value: any;
  manufacturer: number;
}

export interface IssueCommandServiceData {
  entity_id: string;
  cluster_id: number;
  cluster_type: string;
  command: number;
  command_type: string;
}
