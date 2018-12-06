import { HomeAssistant } from "../../../types";
import { ActionConfig } from "../../../data/lovelace";

export interface LovelaceElementConfig {
  type: string;
  style: object;
  entity?: string;
  hold_action?: ActionConfig;
  service?: string;
  service_data?: object;
  tap_action?: ActionConfig;
  title?: string;
  theme?: string;
  icon?: string;
  name?: string;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}
