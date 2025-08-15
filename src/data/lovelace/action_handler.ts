import type { HASSDomEvent } from "../../common/dom/fire_event";

export interface ActionHandlerOptions {
  hasTap?: boolean;
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
}

export interface ActionHandlerDetail {
  action: "hold" | "tap" | "double_tap";
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;
