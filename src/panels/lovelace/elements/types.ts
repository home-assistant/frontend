import { HomeAssistant } from "../../../types";

export interface LovelaceElementConfig {
  type: string;
  entity?: string;
  style: object;
  tap_action?: string;
  navigation_path?: string;
  service?: string;
  title?: string;
  hold_action?: string;
  service_data?: object;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}
