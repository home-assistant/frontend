import {
  Constructor,
  // @ts-ignore
  property,
  PropertyDeclarations,
} from "lit-element";
import { Auth, Connection } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

/* tslint:disable */

export class HassBaseEl {
  protected hass?: HomeAssistant;
  protected _pendingHass: Partial<HomeAssistant> = {};
  protected initializeHass(_auth: Auth, _conn: Connection) {}
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
    protected _pendingHass: Partial<HomeAssistant> = {};
    private __provideHass: HTMLElement[] = [];

    // Decorators not possible in anonymous classes
    // And also, we cannot declare the variable without overriding the Lit setter.
    static get properties(): PropertyDeclarations {
      return {
        hass: {},
      };
    }

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
      // @ts-ignore
      el.hass = this.hass;
    }

    protected async _updateHass(obj: Partial<HomeAssistant>) {
      // @ts-ignore
      if (!this.hass) {
        this._pendingHass = { ...this._pendingHass, ...obj };
        return;
      }
      // @ts-ignore
      this.hass = { ...this.hass, ...obj };
    }
  };
