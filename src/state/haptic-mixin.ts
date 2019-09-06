import { Constructor, LitElement, PropertyValues } from "lit-element";
import { HassBaseEl } from "./hass-base-mixin";
import { handleHaptic } from "../util/haptics";

export const hapticMixin = (superClass: Constructor<LitElement & HassBaseEl>) =>
  class extends superClass {
    protected firstUpdated(changedProps: PropertyValues) {
      super.firstUpdated(changedProps);
      if (navigator.vibrate) {
        window.addEventListener("haptic", (e) => handleHaptic(e.detail));
      }
    }
  };
