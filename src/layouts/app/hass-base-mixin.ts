import {
  Constructor,
  // @ts-ignore
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";

/* tslint:disable */

export class HassBaseEl {
  protected hass?: HomeAssistant;
  protected hassConnected() {}
  protected hassReconnected() {}
  protected hassDisconnected() {}
  protected hassChanged(_hass: HomeAssistant, _oldHass?: HomeAssistant) {}
  protected panelUrlChanged(_newPanelUrl: string) {}
  public provideHass(_el: HTMLElement) {}
  protected _updateHass(_obj: Partial<HomeAssistant>) {}
}

export default <T>(superClass: Constructor<T>): Constructor<T & HassBaseEl> =>
  // @ts-ignore
  class extends superClass {
    private __provideHass: HTMLElement[] = [];
    // @ts-ignore
    @property() protected hass: HomeAssistant;

    // Exists so all methods can safely call super method
    protected hassConnected() {
      // tslint:disable-next-line
    }

    protected hassReconnected() {
      // tslint:disable-next-line
    }

    protected hassDisconnected() {
      // tslint:disable-next-line
    }

    protected panelUrlChanged(_newPanelUrl) {
      // tslint:disable-next-line
    }

    protected hassChanged(hass, _oldHass) {
      this.__provideHass.forEach((el) => {
        (el as any).hass = hass;
      });
    }

    public provideHass(el) {
      this.__provideHass.push(el);
      el.hass = this.hass;
    }

    protected async _updateHass(obj) {
      this.hass = { ...this.hass, ...obj };
    }
  };
