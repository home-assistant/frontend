import { HassEntity } from "home-assistant-js-websocket";

export interface PickerTarget extends EventTarget {
  selected: number;
}

export interface ItemSelectedEvent {
  target?: PickerTarget;
}

export interface Cluster {
  name: string;
  id: string;
  type: string;
}
