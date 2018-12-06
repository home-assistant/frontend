import { HomeAssistant } from "../../../types";
import { ActionConfig } from "../../../data/lovelace";

export interface LovelaceElementConfig {
  type: string;
  style: object;
  entity?: string;
  hold_action?: ActionConfig;
  tap_action?: ActionConfig;
  title?: string;
  theme?: string;
  icon?: string;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}
