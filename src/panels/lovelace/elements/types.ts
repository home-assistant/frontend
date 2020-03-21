import { HomeAssistant } from "../../../types";
import { Condition } from "../common/validate-condition";
import { ActionConfig } from "../../../data/lovelace";

interface LovelaceElementConfigBase {
  type: string;
  style: object;
}

export type LovelaceElementConfig =
  | ConditionalElementConfig
  | IconElementConfig
  | ImageElementConfig
  | ServiceButtonElementConfig
  | StateBadgeElementConfig
  | StateIconElementConfig
  | StateLabelElementConfig;

export interface LovelaceElement extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: LovelaceElementConfig): void;
}

export interface ConditionalElementConfig extends LovelaceElementConfigBase {
  conditions: Condition[];
  elements: LovelaceElementConfigBase[];
}

export interface IconElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  name?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon: string;
}

export interface ImageElementConfig extends LovelaceElementConfigBase {
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

export interface ServiceButtonElementConfig extends LovelaceElementConfigBase {
  title?: string;
  service?: string;
  service_data?: object;
}

export interface StateBadgeElementConfig extends LovelaceElementConfigBase {
  entity: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface StateIconElementConfig extends LovelaceElementConfigBase {
  entity: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon?: string;
  state_color?: boolean;
}

export interface StateLabelElementConfig extends LovelaceElementConfigBase {
  entity: string;
  attribute?: string;
  prefix?: string;
  suffix?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}
