import { isSameDay } from "date-fns";
import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { absoluteTime } from "../common/datetime/absolute_time";
import type { HomeAssistant } from "../types";

const ONE_HOUR = 60 * 60 * 1000;
const SAFE_MARGIN = 5 * 1000;

@customElement("ha-absolute-time")
class HaAbsoluteTime extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public datetime?: string | Date;

  private _lastUpdate?: Date;

  private _timeout?: number;

  private _interval?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTimeout();
    this._clearInterval();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.datetime) {
      this._startTimeout();
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

  private _clearTimeout(): void {
    if (this._interval) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _startTimeout(): void {
    this._clearInterval();
    this._clearTimeout();

    const msToNextHour =
      ONE_HOUR - (new Date().getTime() % ONE_HOUR) + SAFE_MARGIN;

    this._timeout = window.setTimeout(() => {
      this._updateAbsolute();
      this._startInterval();
    }, msToNextHour);
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _startInterval(): void {
    this._clearInterval();

    // update every hour
    this._interval = window.setInterval(() => {
      if (this._lastUpdate && isSameDay(this._lastUpdate, new Date())) {
        return;
      }
      this._updateAbsolute();
    }, ONE_HOUR);
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
