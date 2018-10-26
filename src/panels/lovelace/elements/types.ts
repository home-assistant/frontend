import { HomeAssistant } from "../../../types";

export interface LovelaceElementConfig {
  type: string;
  entity?: string;
  style: object;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}
