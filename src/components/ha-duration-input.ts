import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { normalizeDuration } from "../common/datetime/normalize_duration";
import { fireEvent } from "../common/dom/fire_event";
import type { ValueChangedEvent } from "../types";
import "./ha-base-time-input";
import type { HaBaseTimeInput, TimeChangedEvent } from "./ha-base-time-input";

export interface HaDurationData {
  negative?: boolean;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

const FIELDS = ["milliseconds", "seconds", "minutes", "hours", "days"];

@customElement("ha-duration-input")
export class HaDurationInput extends LitElement {
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

  @property({ attribute: "enable-second", type: Boolean })
  public enableSecond = true;

  @property({ type: Boolean }) public disabled = false;

  @query("ha-base-time-input", true) private _input?: HaBaseTimeInput;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  protected render(): TemplateResult {
    return html`
      <div class="row">
        <ha-base-time-input
          .label=${this.label}
          .helper=${this.helper}
          .required=${this.required}
          .clearable=${!this.required && this.data !== undefined}
          .autoValidate=${this.required}
          .disabled=${this.disabled}
          errorMessage="Required"
          .enableSecond=${this.enableSecond}
          .enableMillisecond=${this.enableMillisecond}
          .enableDay=${this.enableDay}
          .enableSign=${this.allowNegative}
          .negative=${this._negative}
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

  private get _negative(): boolean {
    return !!this.data && normalizeDuration(this.data).negative;
  }

  private _component(field: keyof HaDurationData): number {
    const amount = this.data?.[field];
    if (amount) {
      return this.allowNegative ? Math.abs(Number(amount)) : Number(amount);
    }
    return this.required || this.data ? 0 : NaN;
  }

  private get _days() {
    return this._component("days");
  }

  private get _hours() {
    return this._component("hours");
  }

  private get _minutes() {
    return this._component("minutes");
  }

  private get _seconds() {
    return this._component("seconds");
  }

  private get _milliseconds() {
    return this._component("milliseconds");
  }

  private _durationChanged(
    ev: ValueChangedEvent<TimeChangedEvent | undefined>
  ) {
    ev.stopPropagation();
    const negative = ev.detail.value?.negative ?? false;
    const value = ev.detail.value ? { ...ev.detail.value } : undefined;

    if (value) {
      value.hours ||= 0;
      value.minutes ||= 0;

      if ("days" in value) value.days ||= 0;
      if ("seconds" in value) value.seconds ||= 0;
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

      if (!this.enableSecond && !value.seconds) {
        // @ts-ignore
        delete value.seconds;
      } else if (this.enableSecond && value.seconds > 59) {
        value.minutes = (value.minutes ?? 0) + Math.floor(value.seconds / 60);
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
    }

    fireEvent(this, "value-changed", {
      value:
        value && this.allowNegative ? this._withSign(value, negative) : value,
    });
  }

  private _withSign(value: HaDurationData, negative: boolean): HaDurationData {
    const { negative: _negative, ...components } = normalizeDuration(value);
    return negative ? { negative: true, ...components } : components;
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-duration-input": HaDurationInput;
  }
}
