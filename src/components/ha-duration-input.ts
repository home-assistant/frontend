import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { live } from "lit/directives/live";
import type { DurationUnits } from "../common/datetime/normalize_duration";
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
    const normalized = this.data && normalizeDuration(this.data, this._units);
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
          .negative=${normalized?.negative ?? false}
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

  private get _units(): DurationUnits {
    return {
      enableDay: this.enableDay,
      enableSecond: this.enableSecond,
      enableMillisecond: this.enableMillisecond,
    };
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
    if (!ev.detail.value) {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }
    const { negative: negativeSign, ...fields } = ev.detail.value;
    const typed = applyDurationSign(fields, negativeSign ?? false);
    const { negative, duration } = normalizeDuration(typed, this._units);
    fireEvent(this, "value-changed", {
      value: applyDurationSign(duration, this.allowNegative && negative),
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
