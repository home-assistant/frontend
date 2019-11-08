import { UpdatingElement, PropertyValues } from "lit-element";
import { HomeAssistant, Constructor } from "../types";

export interface ProvideHassElement {
  provideHass(element: HTMLElement);
}

/* tslint:disable-next-line:variable-name */
export const ProvideHassLitMixin = <T extends Constructor<UpdatingElement>>(
  superClass: T
) =>
  class extends superClass {
    protected hass!: HomeAssistant;
    /* tslint:disable-next-line:variable-name */
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
