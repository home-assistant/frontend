import { Constructor, LitElement, PropertyValues } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";

import { HapticType } from "../data/haptics";

const hapticPatterns = {
  success: [50, 50, 50],
  warning: [100, 50, 100],
  failure: [200, 100, 200],
  light: [50],
  medium: [100],
  heavy: [200],
  selection: [20],
};

const handleHaptic = (hapticType: HapticType) => {
  navigator.vibrate(hapticPatterns[hapticType]);
};

export const hapticMixin = (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      if (navigator.vibrate) {
        window.addEventListener("haptic", (e) => handleHaptic(e.detail));
      }
    }
  };
