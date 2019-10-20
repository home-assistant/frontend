import { LitElement, property } from "lit-element";
import { HomeAssistant } from "../types";
import { Auth, Connection } from "home-assistant-js-websocket";

export class HassBaseEl extends LitElement {
  @property() public hass?: HomeAssistant;
  protected _pendingHass: Partial<HomeAssistant> = {};
  // tslint:disable-next-line: variable-name
  private __provideHass: HTMLElement[] = [];

  public provideHass(el) {
    this.__provideHass.push(el);
    el.hass = this.hass;
  }

  protected initializeHass(_auth: Auth, _conn: Connection) {
    // implemented in connection-mixin
    // tslint:disable-next-line
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

  protected _updateHass(obj: Partial<HomeAssistant>) {
    if (!this.hass) {
      this._pendingHass = { ...this._pendingHass, ...obj };
      return;
    }
    this.hass = { ...this.hass, ...obj };
  }
}
