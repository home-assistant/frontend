/**
 * Utility function that enables haptic feedback
 */

import { fireEvent } from "../common/dom/fire_event";

export const forwardHaptic = (el: HTMLElement, hapticType: string) =>
  fireEvent(el, "haptic", { hapticType });
