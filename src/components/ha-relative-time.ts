import {
  customElement,
  UpdatingElement,
  property,
  PropertyValues,
} from "lit-element";

import relativeTime from "../common/datetime/relative_time";

import type { HomeAssistant } from "../types";

@customElement("ha-relative-time")
class HaRelativeTime extends UpdatingElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public datetime?: string;

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
      this.innerHTML = relativeTime(
        new Date(this.datetime),
        this.hass.localize
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-relative-time": HaRelativeTime;
  }
}
