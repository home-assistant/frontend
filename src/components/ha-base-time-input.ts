import { mdiClose } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-list-item";
import "./ha-select";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

export interface TimeChangedEvent {
  days?: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  amPm?: "AM" | "PM";
}

@customElement("ha-base-time-input")
export class HaBaseTimeInput extends LitElement {
  /**
   * Label for the input
   */
  @property() label?: string;

  /**
   * Helper for the input
   */
  @property() helper?: string;

  /**
   * auto validate time inputs
   */
  @property({ attribute: "auto-validate", type: Boolean }) autoValidate = false;

  /**
   * determines if inputs are required
   */
  @property({ type: Boolean }) public required = false;

  /**
   * 12 or 24 hr format
   */
  @property({ type: Number }) format: 12 | 24 = 12;

  /**
   * disables the inputs
   */
  @property({ type: Boolean }) disabled = false;

  /**
   * day
   */
  @property({ type: Number }) days = 0;

  /**
   * hour
   */
  @property({ type: Number }) hours = 0;

  /**
   * minute
   */
  @property({ type: Number }) minutes = 0;

  /**
   * second
   */
  @property({ type: Number }) seconds = 0;

  /**
   * milli second
   */
  @property({ type: Number }) milliseconds = 0;

  /**
   * Label for the day input
   */
  @property({ type: String, attribute: "day-label" }) dayLabel = "";

  /**
   * Label for the hour input
   */
  @property({ type: String, attribute: "hour-label" }) hourLabel = "";

  /**
   * Label for the min input
   */
  @property({ type: String, attribute: "min-label" }) minLabel = "";

  /**
   * Label for the sec input
   */
  @property({ type: String, attribute: "sec-label" }) secLabel = "";

  /**
   * Label for the milli sec input
   */
  @property({ type: String, attribute: "ms-label" }) millisecLabel = "";

  /**
   * show the sec field
   */
  @property({ attribute: "enable-second", type: Boolean })
  public enableSecond = false;

  /**
   * show the milli sec field
   */
  @property({ attribute: "enable-millisecond", type: Boolean })
  public enableMillisecond = false;

  /**
   * show the day field
   */
  @property({ attribute: "enable-day", type: Boolean })
  public enableDay = false;

  /**
   * limit hours input
   */
  @property({ attribute: "no-hours-limit", type: Boolean })
  public noHoursLimit = false;

  /**
   * AM or PM
   */
  @property({ attribute: false }) amPm: "AM" | "PM" = "AM";

  @property({ type: Boolean, reflect: true }) public clearable?: boolean;

  protected render(): TemplateResult {
    return html`
      ${this.label
        ? html`<label>${this.label}${this.required ? " *" : ""}</label>`
        : nothing}
      <div class="time-input-wrap-wrap">
        <div class="time-input-wrap">
          ${this.enableDay
            ? html`
                <ha-textfield
                  id="day"
                  type="number"
                  inputmode="numeric"
                  .value=${this.days.toFixed()}
                  .label=${this.dayLabel}
                  name="days"
                  @change=${this._valueChanged}
                  @focusin=${this._onFocus}
                  no-spinner
                  .required=${this.required}
                  .autoValidate=${this.autoValidate}
                  min="0"
                  .disabled=${this.disabled}
                  suffix=":"
                  class="hasSuffix"
                >
                </ha-textfield>
              `
            : nothing}

          <ha-textfield
            id="hour"
            type="number"
            inputmode="numeric"
            .value=${this.hours.toFixed()}
            .label=${this.hourLabel}
            name="hours"
            @change=${this._valueChanged}
            @focusin=${this._onFocus}
            no-spinner
            .required=${this.required}
            .autoValidate=${this.autoValidate}
            maxlength="2"
            max=${ifDefined(this._hourMax)}
            min="0"
            .disabled=${this.disabled}
            suffix=":"
            class="hasSuffix"
          >
          </ha-textfield>
          <ha-textfield
            id="min"
            type="number"
            inputmode="numeric"
            .value=${this._formatValue(this.minutes)}
            .label=${this.minLabel}
            @change=${this._valueChanged}
            @focusin=${this._onFocus}
            name="minutes"
            no-spinner
            .required=${this.required}
            .autoValidate=${this.autoValidate}
            maxlength="2"
            max="59"
            min="0"
            .disabled=${this.disabled}
            .suffix=${this.enableSecond ? ":" : ""}
            class=${this.enableSecond ? "has-suffix" : ""}
          >
          </ha-textfield>
          ${this.enableSecond
            ? html`<ha-textfield
                id="sec"
                type="number"
                inputmode="numeric"
                .value=${this._formatValue(this.seconds)}
                .label=${this.secLabel}
                @change=${this._valueChanged}
                @focusin=${this._onFocus}
                name="seconds"
                no-spinner
                .required=${this.required}
                .autoValidate=${this.autoValidate}
                maxlength="2"
                max="59"
                min="0"
                .disabled=${this.disabled}
                .suffix=${this.enableMillisecond ? ":" : ""}
                class=${this.enableMillisecond ? "has-suffix" : ""}
              >
              </ha-textfield>`
            : nothing}
          ${this.enableMillisecond
            ? html`<ha-textfield
                id="millisec"
                type="number"
                .value=${this._formatValue(this.milliseconds, 3)}
                .label=${this.millisecLabel}
                @change=${this._valueChanged}
                @focusin=${this._onFocus}
                name="milliseconds"
                no-spinner
                .required=${this.required}
                .autoValidate=${this.autoValidate}
                maxlength="3"
                max="999"
                min="0"
                .disabled=${this.disabled}
              >
              </ha-textfield>`
            : nothing}
          ${this.clearable && !this.required && !this.disabled
            ? html`<ha-icon-button
                label="clear"
                @click=${this._clearValue}
                .path=${mdiClose}
              ></ha-icon-button>`
            : nothing}
        </div>

        ${this.format === 24
          ? nothing
          : html`<ha-select
              .required=${this.required}
              .value=${this.amPm}
              .disabled=${this.disabled}
              name="amPm"
              naturalMenuWidth
              fixedMenuPosition
              @selected=${this._valueChanged}
              @closed=${stopPropagation}
            >
              <ha-list-item value="AM">AM</ha-list-item>
              <ha-list-item value="PM">PM</ha-list-item>
            </ha-select>`}
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _clearValue(): void {
    fireEvent(this, "value-changed");
  }

  private _valueChanged(ev: InputEvent) {
    const textField = ev.currentTarget as HaTextField;
    this[textField.name] =
      textField.name === "amPm" ? textField.value : Number(textField.value);
    const value: TimeChangedEvent = {
      hours: this.hours,
      minutes: this.minutes,
      seconds: this.seconds,
      milliseconds: this.milliseconds,
    };
    if (this.enableDay) {
      value.days = this.days;
    }
    if (this.format === 12) {
      value.amPm = this.amPm;
    }
    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _onFocus(ev: FocusEvent) {
    (ev.currentTarget as HaTextField).select();
  }

  /**
   * Format time fragments
   */
  private _formatValue(value: number, padding = 2) {
    return value.toString().padStart(padding, "0");
  }

  /**
   * 24 hour format has a max hr of 23
   */
  private get _hourMax() {
    if (this.noHoursLimit) {
      return undefined;
    }
    if (this.format === 12) {
      return 12;
    }
    return 23;
  }

  static styles = css`
    :host([clearable]) {
      position: relative;
    }
    .time-input-wrap-wrap {
      display: flex;
    }
    .time-input-wrap {
      display: flex;
      flex: var(--time-input-flex, unset);
      border-radius: var(--mdc-shape-small, 4px) var(--mdc-shape-small, 4px) 0 0;
      overflow: hidden;
      position: relative;
      direction: ltr;
      padding-right: 3px;
    }
    ha-textfield {
      width: 60px;
      flex-grow: 1;
      text-align: center;
      --mdc-shape-small: 0;
      --text-field-appearance: none;
      --text-field-padding: 0 4px;
      --text-field-suffix-padding-left: 2px;
      --text-field-suffix-padding-right: 0;
      --text-field-text-align: center;
    }
    ha-textfield.hasSuffix {
      --text-field-padding: 0 0 0 4px;
    }
    ha-textfield:first-child {
      --text-field-border-top-left-radius: var(--mdc-shape-medium);
    }
    ha-textfield:last-child {
      --text-field-border-top-right-radius: var(--mdc-shape-medium);
    }
    ha-select {
      --mdc-shape-small: 0;
      width: 85px;
    }
    :host([clearable]) .mdc-select__anchor {
      padding-inline-end: var(--select-selected-text-padding-end, 12px);
    }
    ha-icon-button {
      position: relative;
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--secondary-text-color);
      direction: var(--direction);
      display: flex;
      align-items: center;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-bottom-style: solid;
      border-bottom-width: 1px;
    }
    label {
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      -webkit-font-smoothing: var(--ha-font-smoothing);
      font-family: var(
        --mdc-typography-body2-font-family,
        var(--mdc-typography-font-family, var(--ha-font-family-body))
      );
      font-size: var(--mdc-typography-body2-font-size, var(--ha-font-size-s));
      line-height: var(
        --mdc-typography-body2-line-height,
        var(--ha-line-height-condensed)
      );
      font-weight: var(
        --mdc-typography-body2-font-weight,
        var(--ha-font-weight-normal)
      );
      letter-spacing: var(
        --mdc-typography-body2-letter-spacing,
        0.0178571429em
      );
      text-decoration: var(--mdc-typography-body2-text-decoration, inherit);
      text-transform: var(--mdc-typography-body2-text-transform, inherit);
      color: var(--mdc-theme-text-primary-on-background, rgba(0, 0, 0, 0.87));
      padding-left: 4px;
      padding-inline-start: 4px;
      padding-inline-end: initial;
    }
    ha-input-helper-text {
      padding-top: 8px;
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-base-time-input": HaBaseTimeInput;
  }
}
