// Pure resolution of a completed pointer gesture to an action, matching the
// shared action-handler directive. Kept DOM-free so it can be unit-tested; the
// card supplies the current gesture state and applies the outcome.

export type GestureResolution =
  | "tap"
  | "hold"
  | "double_tap"
  | "arm-tap" // first release with a double-tap action: fire tap after the window
  | "none"; // cancelled — do nothing

export interface GestureEndState {
  hasHold: boolean;
  hasDoubleClick: boolean;
  held: boolean;
  cancelled: boolean;
  eventType: string;
  clickDetail: number;
  doubleTapPending: boolean;
}

// A held press is a hold; with a double-tap action a first release arms a tap
// (fired after the double-click window) and a second release within it is a
// double_tap; otherwise a plain tap. A touch cancel (or a moved/scrolled touch
// end) resolves to nothing.
export const resolveGestureEnd = (s: GestureEndState): GestureResolution => {
  if (
    s.eventType === "touchcancel" ||
    (s.eventType === "touchend" && s.cancelled)
  ) {
    return "none";
  }
  if (s.hasHold && s.held) {
    return "hold";
  }
  if (s.hasDoubleClick) {
    if ((s.eventType === "click" && s.clickDetail < 2) || !s.doubleTapPending) {
      return "arm-tap";
    }
    return "double_tap";
  }
  return "tap";
};
