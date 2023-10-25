import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
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

  private _valueStr = "";

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("value")) {
      if (this.value !== Number(this._valueStr)) {
        this._valueStr =
          !this.value || isNaN(this.value) ? "" : this.value.toString();
      }
    }
  }

  protected render() {
    const isBox =
      this.selector.number?.mode === "box" ||
      this.selector.number?.min === undefined ||
      this.selector.number?.max === undefined;

    return html`
      <div class="input">
        ${!isBox
          ? html`
              ${this.label
                ? html`${this.label}${this.required ? "*" : ""}`
                : ""}
              <ha-slider
                labeled
                .min=${this.selector.number?.min}
                .max=${this.selector.number?.max}
                .value=${this.value ?? ""}
                .step=${this.selector.number?.step === "any"
                  ? undefined
                  : this.selector.number?.step ?? 1}
                .disabled=${this.disabled}
                .required=${this.required}
                @change=${this._handleSliderChange}
              >
              </ha-slider>
            `
          : ""}
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
        ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
        : ""}
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
