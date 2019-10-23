import { UpdatingElement, PropertyValues } from "lit-element";
import { HomeAssistant, Constructor } from "../types";

export interface ProvideHassElement {
  provideHass(element: HTMLElement);
}

/* tslint:disable */

export const ProvideHassLitMixin = <T extends Constructor<UpdatingElement>>(
  superClass: T
) =>
  // @ts-ignore
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
