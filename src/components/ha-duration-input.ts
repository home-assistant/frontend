import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { live } from "lit/directives/live";
import {
  applyDurationSign,
  normalizeDuration,
} from "../common/datetime/normalize_duration";
import { fireEvent } from "../common/dom/fire_event";
import type { ValueChangedEvent } from "../types";
import "./ha-base-time-input";
import type { HaBaseTimeInput, TimeChangedEvent } from "./ha-base-time-input";

export interface HaDurationData {
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
    const normalized =
      this.data &&
      normalizeDuration(this.data, {
        enableDay: this.enableDay,
        enableMillisecond: this.enableMillisecond,
      });
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
          .negative=${live(normalized?.negative ?? false)}
          format="24"
          .days=${live(this._fieldValue(normalized?.duration, "days"))}
          .hours=${live(this._fieldValue(normalized?.duration, "hours"))}
          .minutes=${live(this._fieldValue(normalized?.duration, "minutes"))}
          .seconds=${live(this._fieldValue(normalized?.duration, "seconds"))}
          .milliseconds=${live(this._fieldValue(normalized?.duration, "milliseconds"))}
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

  private _fieldValue(
    data: HaDurationData | undefined,
    field: keyof HaDurationData
  ): number {
    return data?.[field] ?? (this.required ? 0 : NaN);
  }

  private _durationChanged(
    ev: ValueChangedEvent<TimeChangedEvent | undefined>
  ) {
    ev.stopPropagation();
    const negative = ev.detail.value?.negative ?? false;
    const value = ev.detail.value ? { ...ev.detail.value } : undefined;

    if (value) {
      delete value.negative;
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
      value: value && applyDurationSign(value, negative),
    });
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
    }
    /* Full width: bigger touch targets, no ragged right edge in a form. */
    ha-base-time-input {
      flex: 1;
      --time-input-flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-duration-input": HaDurationInput;
  }
}
