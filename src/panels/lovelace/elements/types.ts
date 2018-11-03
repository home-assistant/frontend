import { HomeAssistant } from "../../../types";

export interface LovelaceElementConfig {
  type: string;
  style: object;
  entity?: string;
  hold_action?: string;
  navigation_path?: string;
  service?: string;
  service_data?: object;
  tap_action?: string;
  title?: string;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}
