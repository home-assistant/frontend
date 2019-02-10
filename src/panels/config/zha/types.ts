import { HassEntity } from "home-assistant-js-websocket";
import { ZHADeviceEntity, Cluster } from "../../../data/zha";

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

export interface SetAttributeServiceData {
  ieee: string;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  value: any;
  manufacturer: number;
}

export interface IssueCommandServiceData {
  ieee: string;
  cluster_id: number;
  cluster_type: string;
  command: number;
  command_type: string;
}

export interface ZHAEntitySelectedParams {
  entity: HassEntity;
}

export interface ZHAEntitiesLoadedParams {
  entities: HassEntity[];
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
