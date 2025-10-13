import type { HassServiceTarget } from "home-assistant-js-websocket";
import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { HomeAssistant } from "../../../types";
import type { Condition } from "../common/validate-condition";
import type { HuiImage } from "../components/hui-image";

interface LovelaceElementConfigBase {
  type: string;
  style?: Record<string, string>;
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
  preview?: boolean;
  setConfig(config: LovelaceElementConfig): void;
}

export interface ConditionalElementConfig extends LovelaceElementConfigBase {
  conditions: Condition[];
  elements: LovelaceElementConfigBase[];
  title?: string;
}

export interface IconElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  name?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon?: string;
  title?: string;
}

export interface ImageElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  image?: string;
  image_entity?: string;
  state_image?: string;
  camera_image?: string;
  camera_view?: HuiImage["cameraView"];
  dark_mode_image?: string;
  dark_mode_filter?: string;
  filter?: string;
  state_filter?: string;
  aspect_ratio?: string;
  title?: string;
}

export interface ServiceButtonElementConfig extends LovelaceElementConfigBase {
  title?: string;
  /* @deprecated "service" is kept for backwards compatibility. Replaced by "action". */
  service?: string;
  action?: string;
  target?: HassServiceTarget;
  /* @deprecated "service_data" is kept for backwards compatibility. Replaced by "data". */
  service_data?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface StateBadgeElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  title?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface StateIconElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  icon?: string;
  state_color?: boolean;
  title?: string;
}

export interface StateLabelElementConfig extends LovelaceElementConfigBase {
  entity?: string;
  attribute?: string;
  prefix?: string;
  suffix?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  title?: string;
}
