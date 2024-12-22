import { PropertyValues, ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import { relativeTime } from "../common/datetime/relative_time";
import { capitalizeFirstLetter } from "../common/string/capitalize-first-letter";
import type { HomeAssistant } from "../types";

@customElement("ha-relative-time")
class HaRelativeTime extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public datetime?: string | Date;

  @property({ type: Boolean }) public capitalize = false;

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
    this._updateRelative();
  }

  protected update(changedProps: PropertyValues) {
    super.update(changedProps);
    this._updateRelative();
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
    this._interval = window.setInterval(() => this._updateRelative(), 60000);
  }

  private _updateRelative(): void {
    if (!this.datetime) {
      this.innerHTML = this.hass.localize("ui.components.relative_time.never");
    } else {
      const relTime = relativeTime(new Date(this.datetime), this.hass.locale);
      this.innerHTML = this.capitalize
        ? capitalizeFirstLetter(relTime)
        : relTime;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-relative-time": HaRelativeTime;
  }
}
