import type { Constructor, HomeAssistant } from "../types";
import type { PropertyValues, ReactiveElement } from "lit";

export interface ProvideHassElement {
  provideHass(element: HTMLElement);
}

export const ProvideHassLitMixin = <T extends Constructor<ReactiveElement>>(
  superClass: T
) =>
  class extends superClass {
    protected hass!: HomeAssistant;

    private __provideHass: HTMLElement[] = [];

    public provideHass(el) {
      this.__provideHass.push(el);
      el.hass = this.hass;
    }

    protected updated(changedProps: PropertyValues) {
      super.updated(changedProps);

      if (changedProps.has("hass")) {
        this.__provideHass.forEach((el) => {
          (el as any).hass = this.hass;
        });
      }
    }
  };
