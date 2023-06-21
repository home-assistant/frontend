import { HassConfig } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../common/datetime/format_date";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { formatTime } from "../../../common/datetime/format_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { capitalizeFirstLetter } from "../../../common/string/capitalize-first-letter";
import { FrontendLocaleData } from "../../../data/translation";
import { HomeAssistant } from "../../../types";
import { TimestampRenderingFormat } from "./types";

const FORMATS: {
  [key: string]: (
    ts: Date,
    lang: FrontendLocaleData,
    config: HassConfig
  ) => string;
} = {
  date: formatDate,
  datetime: formatDateTime,
  time: formatTime,
};
const INTERVAL_FORMAT = ["relative", "total"];

@customElement("hui-timestamp-display")
class HuiTimestampDisplay extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public ts?: Date;

  @property() public format?: TimestampRenderingFormat;

  @property({ type: Boolean }) public capitalize = false;

  @state() private _relative?: string;

  private _connected?: boolean;

  private _interval?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    this._connected = true;
    this._startInterval();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._connected = false;
    this._clearInterval();
  }

  protected render() {
    if (!this.ts || !this.hass) {
      return nothing;
    }

    if (isNaN(this.ts.getTime())) {
      return html`${this.hass.localize(
        "ui.panel.lovelace.components.timestamp-display.invalid"
      )}`;
    }

    const format = this._format;

    if (INTERVAL_FORMAT.includes(format)) {
      return html` ${this._relative} `;
    }
    if (format in FORMATS) {
      return html`
        ${FORMATS[format](this.ts, this.hass.locale, this.hass.config)}
      `;
    }
    return html`${this.hass.localize(
      "ui.panel.lovelace.components.timestamp-display.invalid_format"
    )}`;
  }

  protected updated(changedProperties: PropertyValues): void {
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

  private get _format(): string {
    return this.format || "relative";
  }

  private _startInterval(): void {
    this._clearInterval();
    if (this._connected && INTERVAL_FORMAT.includes(this._format)) {
      this._updateRelative();
      this._interval = window.setInterval(() => this._updateRelative(), 1000);
    }
  }

  private _clearInterval(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _updateRelative(): void {
    if (this.ts && this.hass?.localize) {
      this._relative =
        this._format === "relative"
          ? relativeTime(this.ts, this.hass!.locale)
          : relativeTime(new Date(), this.hass!.locale, this.ts, false);

      this._relative = this.capitalize
        ? capitalizeFirstLetter(this._relative)
        : this._relative;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timestamp-display": HuiTimestampDisplay;
  }
}
