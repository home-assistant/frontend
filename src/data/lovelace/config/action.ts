import type { HassServiceTarget } from "home-assistant-js-websocket";

export interface ToggleActionConfig extends BaseActionConfig {
  action: "toggle";
}

export interface CallServiceActionConfig extends BaseActionConfig {
  action: "call-service" | "perform-action";
  /** @deprecated "service" is kept for backwards compatibility. Replaced by "perform_action". */
  service?: string;
  perform_action: string;
  target?: HassServiceTarget;
  /** @deprecated "service_data" is kept for backwards compatibility. Replaced by "data". */
  service_data?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface NavigateActionConfig extends BaseActionConfig {
  action: "navigate";
  navigation_path: string;
  navigation_replace?: boolean;
}

export interface UrlActionConfig extends BaseActionConfig {
  action: "url";
  url_path: string;
}

export interface MoreInfoActionConfig extends BaseActionConfig {
  action: "more-info";
  entity?: string;
}

export interface AssistActionConfig extends BaseActionConfig {
  action: "assist";
  pipeline_id?: string;
  start_listening?: boolean;
}

export interface NoActionConfig extends BaseActionConfig {
  action: "none";
}

export interface CustomActionConfig extends BaseActionConfig {
  action: "fire-dom-event";
}

export interface BaseActionConfig {
  action: string;
  confirmation?: ConfirmationRestrictionConfig;
}

export interface ConfirmationRestrictionConfig {
  text?: string;
  exemptions?: RestrictionConfig[];
}

export interface RestrictionConfig {
  user: string;
}

export type ActionConfig =
  | ToggleActionConfig
  | CallServiceActionConfig
  | NavigateActionConfig
  | UrlActionConfig
  | MoreInfoActionConfig
  | AssistActionConfig
  | NoActionConfig
  | CustomActionConfig;
