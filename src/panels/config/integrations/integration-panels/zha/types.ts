import { HaSelect } from "../../../../../components/ha-select";
import { ZHADevice } from "../../../../../data/zha";

export interface ItemSelectedEvent {
  target?: HaSelect;
}

export interface ZHADeviceRemovedEvent {
  detail?: {
    device?: ZHADevice;
  };
}

export interface ChangeEvent {
  detail?: {
    value?: any;
  };
  target?: EventTarget;
}

export interface SetAttributeServiceData {
  ieee: string;
  endpoint_id: number;
  cluster_id: number;
  cluster_type: string;
  attribute: number;
  value: any;
  manufacturer?: number;
}

export interface IssueCommandServiceData {
  ieee: string;
  endpoint_id: number;
  cluster_id: number;
  cluster_type: string;
  command: number;
  command_type: string;
  params?: any;
}

export interface ZHADeviceSelectedParams {
  node: ZHADevice;
}

export interface NodeServiceData {
  ieee_address: string;
}
