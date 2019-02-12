import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";

export interface AutomationEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    id?: string;
  };
}

export interface AutomationConfig {
  alias: string;
  trigger: any[];
  condition?: any[];
  action: any[];
}
