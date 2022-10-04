import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { NumberSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-input-helper-text";
import "../ha-slider";
import "../ha-textfield";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: NumberSelector;

  @property() public value?: number;

  @property() public placeholder?: number;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = true;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    const isBox = this.selector.number.mode === "box";

    return html`
      <div class="input">
        ${!isBox
          ? html`
              ${this.label
                ? html`${this.label}${this.required ? " *" : ""}`
                : ""}
              <ha-slider
                .min=${this.selector.number.min}
                .max=${this.selector.number.max}
                .value=${this._value}
                .step=${this.selector.number.step ?? 1}
                .disabled=${this.disabled}
                .required=${this.required}
                pin
                ignore-bar-touch
                @change=${this._handleSliderChange}
              >
              </ha-slider>
            `
          : ""}
        <ha-textfield
          .inputMode=${(this.selector.number.step || 1) % 1 !== 0
            ? "decimal"
            : "numeric"}
          .label=${this.selector.number.mode !== "box" ? undefined : this.label}
          .placeholder=${this.placeholder}
          class=${classMap({ single: this.selector.number.mode === "box" })}
          .min=${this.selector.number.min}
          .max=${this.selector.number.max}
          .value=${this.value ?? ""}
          .step=${this.selector.number.step ?? 1}
          helperPersistent
          .helper=${isBox ? this.helper : undefined}
          .disabled=${this.disabled}
          .required=${this.required}
          .suffix=${this.selector.number.unit_of_measurement}
          type="number"
          autoValidate
          ?no-spinner=${this.selector.number.mode !== "box"}
          @input=${this._handleInputChange}
        >
        </ha-textfield>
      </div>
      ${!isBox && this.helper
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""}
    `;
  }

  private get _value() {
    return this.value ?? (this.selector.number.min || 0);
  }

  private _handleInputChange(ev) {
    ev.stopPropagation();
    const value =
      ev.target.value === "" || isNaN(ev.target.value)
        ? this.required
          ? this.selector.number.min || 0
          : undefined
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

  static get styles(): CSSResultGroup {
    return css`
      .input {
        display: flex;
        justify-content: space-between;
        align-items: center;
        direction: ltr;
      }
      ha-slider {
        flex: 1;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-number": HaNumberSelector;
  }
}
