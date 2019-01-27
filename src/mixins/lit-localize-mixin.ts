import { Constructor, LitElement } from "lit-element";
import { HomeAssistant, LocalizeMixin } from "../types";

const empty = () => "";

export const hassLocalizeLitMixin = <T extends LitElement>(
  superClass: Constructor<T>
): Constructor<T & LocalizeMixin> =>
  // @ts-ignore
  class extends superClass {
    public hass?: HomeAssistant;

    get localize() {
      return this.hass ? this.hass.localize : empty;
    }
  };
