import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import { HomeAssistant } from "../../../types";
import format_date from "../../../common/datetime/format_date";
import format_date_time from "../../../common/datetime/format_date_time";
import format_time from "../../../common/datetime/format_time";
import relativeTime from "../../../common/datetime/relative_time";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";

const FORMATS: { [key: string]: (ts: Date, lang: string) => string } = {
  date: format_date,
  datetime: format_date_time,
  time: format_time,
};
const INTERVAL_FORMAT = ["relative", "total"];

class HuiTimestampDisplay extends hassLocalizeLitMixin(LitElement) {
  public hass?: HomeAssistant;
  public ts?: Date;
  public format?: "relative" | "total" | "date" | "datetime" | "time";
  private _relative?: string;
  private _connected?: boolean;
  private _interval?: number;

  static get properties(): PropertyDeclarations {
    return {
      ts: {},
      hass: {},
      format: {},
      _relative: {},
    };
  }

  public connectedCallback() {
    super.connectedCallback();
    this._connected = true;
    this._startInterval();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._connected = false;
    this._clearInterval();
  }

  protected render(): TemplateResult {
    if (!this.ts || !this.hass) {
      return html``;
    }

    if (isNaN(this.ts.getTime())) {
      return html`
        Invalid date
      `;
    }

    const format = this._format;

    if (INTERVAL_FORMAT.includes(format)) {
      return html`
        ${this._relative}
      `;
    } else if (format in FORMATS) {
      return html`
        ${FORMATS[format](this.ts, this.hass.language)}
      `;
    } else {
      return html`
        Invalid format
      `;
    }
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (!changedProperties.has("format") || !this._connected) {
      return;
    }

    if (INTERVAL_FORMAT.includes("relative")) {
      this._startInterval();
    } else {
      this._clearInterval();
    }
  }

  private get _format() {
    return this.format || "relative";
  }

  private _startInterval() {
    this._clearInterval();
    if (this._connected && INTERVAL_FORMAT.includes(this._format)) {
      this._updateRelative();
      this._interval = window.setInterval(() => this._updateRelative(), 1000);
    }
  }

  private _clearInterval() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _updateRelative() {
    if (this.ts && this.localize) {
      this._relative =
        this._format === "relative"
          ? relativeTime(this.ts, this.localize)
          : (this._relative = relativeTime(new Date(), this.localize, {
              compareTime: this.ts,
              includeTense: false,
            }));
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timestamp-display": HuiTimestampDisplay;
  }
}

customElements.define("hui-timestamp-display", HuiTimestampDisplay);
