import { HassEntity } from "home-assistant-js-websocket";

export interface PickerTarget extends EventTarget {
  selected: number;
}

export interface ItemSelectedEvent {
  target?: PickerTarget;
}

export interface ChangeEvent {
  detail?: {
    value?: any;
  };
  target?: EventTarget;
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

export interface ReadAttributeServiceData {
  type: string;
  entity_id: string;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  manufacturer: number;
}

export interface IssueCommandServiceData {
  entity_id: string;
  cluster_id: number;
  cluster_type: string;
  command: number;
  command_type: string;
}

export interface ZHADeviceEntity extends HassEntity {
  device_info?: {
    identifiers: any[];
  };
}

export interface ZHAEntitySelectedParams {
  entity: HassEntity;
}

export interface ZHANodeSelectedParams {
  node: ZHADeviceEntity;
}

export interface ZHAClusterSelectedParams {
  cluster: Cluster;
}

export interface NodeServiceData {
  ieee_address: string;
}
