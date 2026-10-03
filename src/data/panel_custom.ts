import type { PanelInfo } from "../types";

export interface CustomPanelConfig {
  name: string;
  embed_iframe: boolean;
  trust_external: boolean;
  js_url?: string;
  module_url?: string;
  // When true, the panel takes care of the safe-area insets itself (e.g. it
  // consumes the `--safe-area-inset-*` variables or draws into the safe area on
  // purpose). Home Assistant then skips adding its own safe-area padding around
  // the panel to avoid doubling the insets.
  handle_safe_area?: boolean;
}

export type CustomPanelInfo<T = Record<string, unknown>> = PanelInfo<
  T & { _panel_custom: CustomPanelConfig }
>;
