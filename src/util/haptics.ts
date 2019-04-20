/**
 * Utility function that enables haptic feedback
 */

import { fireEvent } from "../common/dom/fire_event";

// Allowed types are from iOS HIG.
// https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/feedback/#haptics
// Implementors on platforms other than iOS should attempt to match the patterns (shown in HIG) as closely as possible.
const ALLOWED_HAPTIC_TYPES = [
  "success",
  "warning",
  "failure",
  "light",
  "medium",
  "heavy",
  "selection",
];

export const forwardHaptic = (el: HTMLElement, hapticType: string) => {
  if (ALLOWED_HAPTIC_TYPES.indexOf(hapticType) === -1) {
    throw new Error(`Unknown haptic type: ${hapticType}`);
  }
  fireEvent(el, "haptic", { hapticType });
};
