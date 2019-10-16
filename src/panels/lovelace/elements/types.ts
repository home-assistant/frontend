import { HomeAssistant } from "../../../types";
import { Condition } from "../common/validate-condition";
import { ActionConfig } from "../../../data/lovelace";

export interface LovelaceElementConfig {
  type: string;
  style: object;
}

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}

export interface ConditionalElementConfig extends LovelaceElementConfig {
  conditions: Condition[];
  elements: LovelaceElementConfig[];
}

export interface IconElementConfig extends LovelaceElementConfig {
  entity?: string;
  name?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon: string;
}

export interface ImageElementConfig extends LovelaceElementConfig {
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  image?: string;
  state_image?: string;
  camera_image?: string;
  filter?: string;
  state_filter?: string;
  aspect_ratio?: string;
}

export interface ServiceButtonElementConfig extends LovelaceElementConfig {
  title?: string;
  service?: string;
  service_data?: object;
}

export interface StateBadgeElementConfig extends LovelaceElementConfig {
  entity: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface StateIconElementConfig extends LovelaceElementConfig {
  entity: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon?: string;
}

export interface StateLabelElementConfig extends LovelaceElementConfig {
  entity: string;
  prefix?: string;
  suffix?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
