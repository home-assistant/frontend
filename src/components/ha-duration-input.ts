import { mdiMinusThick, mdiPlusThick } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-base-time-input";
import type { TimeChangedEvent } from "./ha-base-time-input";
import "./ha-button-toggle-group";

export interface HaDurationData {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

const FIELDS = ["milliseconds", "seconds", "minutes", "hours", "days"];

@customElement("ha-duration-input")
class HaDurationInput extends LitElement {
  @property({ attribute: false }) public data?: HaDurationData;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = false;

  @property({ attribute: "enable-millisecond", type: Boolean })
  public enableMillisecond = false;

  @property({ attribute: "enable-day", type: Boolean })
  public enableDay = false;

  @property({ attribute: "allow-negative", type: Boolean })
  public allowNegative = false;

  @property({ type: Boolean }) public disabled = false;

  private _toggleNegative = false;

  protected render(): TemplateResult {
    return html`
      <div class="row">
        ${this.allowNegative
          ? html`
              <ha-button-toggle-group
                size="small"
                .buttons=${[
                  { label: "+", iconPath: mdiPlusThick, value: "+" },
                  { label: "-", iconPath: mdiMinusThick, value: "-" },
                ]}
                .active=${this._negative ? "-" : "+"}
                @value-changed=${this._negativeChanged}
              ></ha-button-toggle-group>
            `
          : nothing}
        <ha-base-time-input
          .label=${this.label}
          .helper=${this.helper}
          .required=${this.required}
          .clearable=${!this.required && this.data !== undefined}
          .autoValidate=${this.required}
          .disabled=${this.disabled}
          errorMessage="Required"
          enable-second
          .enableMillisecond=${this.enableMillisecond}
          .enableDay=${this.enableDay}
          format="24"
          .days=${this._days}
          .hours=${this._hours}
          .minutes=${this._minutes}
          .seconds=${this._seconds}
          .milliseconds=${this._milliseconds}
          @value-changed=${this._durationChanged}
          no-hours-limit
          day-label="dd"
          hour-label="hh"
          min-label="mm"
          sec-label="ss"
          ms-label="ms"
        ></ha-base-time-input>
      </div>
    `;
  }

  private get _negative() {
    return (
      this._toggleNegative ||
      (this.data?.days
        ? this.data.days < 0
        : this.data?.hours
          ? this.data.hours < 0
          : this.data?.minutes
            ? this.data.minutes < 0
            : this.data?.seconds
              ? this.data.seconds < 0
              : this.data?.milliseconds
                ? this.data.milliseconds < 0
                : false)
    );
  }

  private get _days() {
    return this.data?.days
      ? this.allowNegative
        ? Math.abs(Number(this.data.days))
        : Number(this.data.days)
      : this.required || this.data
        ? 0
        : NaN;
  }

  private get _hours() {
    return this.data?.hours
      ? this.allowNegative
        ? Math.abs(Number(this.data.hours))
        : Number(this.data.hours)
      : this.required || this.data
        ? 0
        : NaN;
  }

  private get _minutes() {
    return this.data?.minutes
      ? this.allowNegative
        ? Math.abs(Number(this.data.minutes))
        : Number(this.data.minutes)
      : this.required || this.data
        ? 0
        : NaN;
  }

  private get _seconds() {
    return this.data?.seconds
      ? this.allowNegative
        ? Math.abs(Number(this.data.seconds))
        : Number(this.data.seconds)
      : this.required || this.data
        ? 0
        : NaN;
  }

  private get _milliseconds() {
    return this.data?.milliseconds
      ? this.allowNegative
        ? Math.abs(Number(this.data.milliseconds))
        : Number(this.data.milliseconds)
      : this.required || this.data
        ? 0
        : NaN;
  }

  private _durationChanged(ev: CustomEvent<{ value?: TimeChangedEvent }>) {
    ev.stopPropagation();
    const value = ev.detail.value ? { ...ev.detail.value } : undefined;

    if (value) {
      value.hours ||= 0;
      value.minutes ||= 0;
      value.seconds ||= 0;

      if ("days" in value) value.days ||= 0;
      if ("milliseconds" in value) value.milliseconds ||= 0;

      if (this.allowNegative) {
        FIELDS.forEach((t) => {
          if (value[t]) {
            value[t] = Math.abs(value[t]);
          }
        });
      }

      if (!this.enableMillisecond && !value.milliseconds) {
        // @ts-ignore
        delete value.milliseconds;
      } else if (value.milliseconds > 999) {
        value.seconds += Math.floor(value.milliseconds / 1000);
        value.milliseconds %= 1000;
      }

      if (value.seconds > 59) {
        value.minutes += Math.floor(value.seconds / 60);
        value.seconds %= 60;
      }

      if (value.minutes > 59) {
        value.hours += Math.floor(value.minutes / 60);
        value.minutes %= 60;
      }

      if (this.enableDay && value.hours > 24) {
        value.days = (value.days ?? 0) + Math.floor(value.hours / 24);
        value.hours %= 24;
      }

      if (this._negative) {
        FIELDS.forEach((t) => {
          if (value[t]) {
            value[t] = -Math.abs(value[t]);
          }
        });
      }
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _negativeChanged(ev) {
    ev.stopPropagation();
    const negative = (ev.detail?.value || ev.target.value) === "-";
    this._toggleNegative = negative;
    const value = this.data;
    if (value) {
      FIELDS.forEach((t) => {
        if (value[t]) {
          value[t] = negative ? -Math.abs(value[t]) : Math.abs(value[t]);
        }
      });
      fireEvent(this, "value-changed", {
        value,
      });
    }
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
    }
    ha-button-toggle-group {
      margin: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-duration-input": HaDurationInput;
  }
}
