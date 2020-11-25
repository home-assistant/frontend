import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { NumberSelector } from "../../data/selector";
import "@polymer/paper-input/paper-input";
import "../ha-slider";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: NumberSelector;

  @property() public value?: number;

  @property() public label?: string;

  protected render() {
    if (this.selector.number.mode === "slider") {
      return html`${this.label}<ha-slider
          .min=${this.selector.number.min}
          .max=${this.selector.number.max}
          .value=${this._value}
          .step=${this.selector.number.step}
          pin
          editable
          ignore-bar-touch
          @change=${this._handleSliderChange}
        >
        </ha-slider>`;
    }
    return html`<paper-input
      pattern="[0-9]+([\\.][0-9]+)?"
      .label=${this.label}
      .min=${this.selector.number.min}
      .max=${this.selector.number.max}
      .value=${this._value}
      .step=${this.selector.number.step}
      type="number"
      auto-validate
      @value-changed=${this._handleInputChange}
    >
    </paper-input>`;
  }

  private get _value() {
    return this.value || 0;
  }

  private _handleInputChange(ev) {
    const value = ev.detail.value;
    if (this._value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _handleSliderChange(ev) {
    const value = ev.target.value;
    if (this._value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      ha-slider {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-number": HaNumberSelector;
  }
}
