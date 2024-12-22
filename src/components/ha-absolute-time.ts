import { addDays, differenceInMilliseconds, startOfDay } from "date-fns";
import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { absoluteTime } from "../common/datetime/absolute_time";
import type { HomeAssistant } from "../types";

const SAFE_MARGIN = 5 * 1000;

@customElement("ha-absolute-time")
class HaAbsoluteTime extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public datetime?: string | Date;

  private _timeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTimeout();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.datetime) {
      this._updateNextDay();
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
    if (this._timeout) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _updateNextDay(): void {
    this._clearTimeout();

    const now = new Date();
    const nextDay = addDays(startOfDay(now), 1);
    const ms = differenceInMilliseconds(nextDay, now) + SAFE_MARGIN;

    this._timeout = window.setTimeout(() => {
      this._updateNextDay();
      this._updateAbsolute();
    }, ms);
  }

  private _updateAbsolute(): void {
    if (!this.datetime) {
      this.innerHTML = this.hass.localize("ui.components.absolute_time.never");
    } else {
      this.innerHTML = absoluteTime(
        new Date(this.datetime),
        this.hass.locale,
        this.hass.config
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-absolute-time": HaAbsoluteTime;
  }
}
