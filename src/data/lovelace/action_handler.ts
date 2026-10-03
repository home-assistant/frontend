import type { HASSDomEvent } from "../../common/dom/fire_event";

export interface ActionHandlerOptions {
  hasTap?: boolean;
  hasHold?: boolean;
  hasDoubleClick?: boolean;
  disabled?: boolean;
  /**
   * Only listen for keyboard activation; pointer gestures are handled
   * elsewhere (a container binding with `resolve` owns them).
   */
  keyboardOnly?: boolean;
  /**
   * Container binding: resolve a pointer gesture at viewport coordinates
   * (x, y) to the element that should receive the action. Returning null
   * leaves the event alone. The resolver runs at both the start and the end
   * of a gesture; a release resolving to a different target aborts it.
   */
  resolve?: (x: number, y: number, ev: Event) => ActionHandlerResolution | null;
}

export interface ActionHandlerResolution {
  target: HTMLElement;
  options: ActionHandlerOptions;
}

export interface ActionHandlerDetail {
  action: "hold" | "tap" | "double_tap";
}

export type ActionHandlerEvent = HASSDomEvent<ActionHandlerDetail>;
