import {
  HassEntityBase,
  HassEntityAttributeBase,
} from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface AutomationEntity extends HassEntityBase {
  attributes: HassEntityAttributeBase & {
    id?: string;
    last_triggered: string;
  };
}

export interface AutomationConfig {
  alias: string;
  trigger: any[];
  condition?: any[];
  action: any[];
}

export const deleteAutomation = (hass: HomeAssistant, id: string) =>
  hass.callApi("DELETE", `config/automation/config/${id}`);
