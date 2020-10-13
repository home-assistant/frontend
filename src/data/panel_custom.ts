import { PanelInfo } from "../types";

export interface CustomPanelConfig {
  name: string;
  embed_iframe: boolean;
  trust_external: boolean;
  js_url?: string;
  module_url?: string;
  html_url?: string;
}

export type CustomPanelInfo<T = Record<string, unknown>> = PanelInfo<
  T & { _panel_custom: CustomPanelConfig }
>;
