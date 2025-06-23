import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import type { NumberSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-input-helper-text";
import "../ha-slider";
import "../ha-textfield";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: NumberSelector;

  @property({ type: Number }) public value?: number;

  @property({ type: Number }) public placeholder?: number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = true;

  @property({ type: Boolean }) public disabled = false;

  private _valueStr = "";

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("value")) {
      if (this._valueStr === "" || this.value !== Number(this._valueStr)) {
        this._valueStr =
          this.value == null || isNaN(this.value) ? "" : this.value.toString();
      }
    }
  }

  protected render() {
    const isBox =
      this.selector.number?.mode === "box" ||
      this.selector.number?.min === undefined ||
      this.selector.number?.max === undefined;

    let sliderStep;

    if (!isBox) {
      sliderStep = this.selector.number!.step ?? 1;
      if (sliderStep === "any") {
        sliderStep = 1;
        // divide the range of the slider by 100 steps
        const step =
          (this.selector.number!.max! - this.selector.number!.min!) / 100;
        // biggest step size is 1, round the step size to a division of 1
        while (sliderStep > step) {
          sliderStep /= 10;
        }
      }
    }

    return html`
      ${this.label && !isBox
        ? html`${this.label}${this.required ? "*" : ""}`
        : nothing}
      <div class="input">
        ${!isBox
          ? html`
              <ha-slider
                labeled
                .min=${this.selector.number!.min}
                .max=${this.selector.number!.max}
                .value=${this.value ?? ""}
                .step=${sliderStep}
                .disabled=${this.disabled}
                .required=${this.required}
                @change=${this._handleSliderChange}
                .ticks=${this.selector.number?.slider_ticks}
              >
              </ha-slider>
            `
          : nothing}
        <ha-textfield
          .inputMode=${this.selector.number?.step === "any" ||
          (this.selector.number?.step ?? 1) % 1 !== 0
            ? "decimal"
            : "numeric"}
          .label=${!isBox ? undefined : this.label}
          .placeholder=${this.placeholder}
          class=${classMap({ single: isBox })}
          .min=${this.selector.number?.min}
          .max=${this.selector.number?.max}
          .value=${this._valueStr ?? ""}
          .step=${this.selector.number?.step ?? 1}
          helperPersistent
          .helper=${isBox ? this.helper : undefined}
          .disabled=${this.disabled}
          .required=${this.required}
          .suffix=${this.selector.number?.unit_of_measurement}
          type="number"
          autoValidate
          ?no-spinner=${!isBox}
          @input=${this._handleInputChange}
        >
        </ha-textfield>
      </div>
      ${!isBox && this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private _handleInputChange(ev) {
    ev.stopPropagation();
    this._valueStr = ev.target.value;
    const value =
      ev.target.value === "" || isNaN(ev.target.value)
        ? undefined
        : Number(ev.target.value);
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _handleSliderChange(ev) {
    ev.stopPropagation();
    const value = Number(ev.target.value);
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static styles = css`
    .input {
      display: flex;
      justify-content: space-between;
      align-items: center;
      direction: ltr;
    }
    ha-slider {
      flex: 1;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: 0;
    }
    ha-textfield {
      --ha-textfield-input-width: 40px;
    }
    .single {
      --ha-textfield-input-width: unset;
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-number": HaNumberSelector;
  }
}
