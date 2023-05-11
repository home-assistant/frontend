import { isSameDay } from "date-fns";
import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { absoluteTime } from "../common/datetime/absolute_time";
import type { HomeAssistant } from "../types";

@customElement("ha-absolute-time")
class HaAbsoluteTime extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public datetime?: string | Date;

  private _lastUpdate?: Date;

  private _interval?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearInterval();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.datetime) {
      this._startInterval();
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._updateAbsolute();
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);
    this._updateAbsolute();
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _startInterval(): void {
    this._clearInterval();

    // update every 60 seconds
    this._interval = window.setInterval(() => {
      if (this._lastUpdate && isSameDay(this._lastUpdate, new Date())) {
        return;
      }
      this._updateAbsolute();
    }, 60000);
  }

  private _updateAbsolute(): void {
    this._lastUpdate = new Date();
    if (!this.datetime) {
      this.innerHTML = this.hass.localize("ui.components.absolute_time.never");
    } else {
      this.innerHTML = absoluteTime(new Date(this.datetime), this.hass.locale);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-absolute-time": HaAbsoluteTime;
  }
}
