import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { NumberSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-slider";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: NumberSelector;

  @property() public value?: number;

  @property() public label?: string;

  protected render() {
    return html`${this.label}
      ${this.selector.number.mode === "slider"
        ? html`<ha-slider
            .min=${this.selector.number.min}
            .max=${this.selector.number.max}
            .value=${this._value}
            .step=${this.selector.number.step}
            pin
            ignore-bar-touch
            @change=${this._handleSliderChange}
          >
          </ha-slider>`
        : ""}
      <paper-input
        pattern="[0-9]+([\\.][0-9]+)?"
        .label=${this.selector.number.mode === "slider"
          ? undefined
          : this.label}
        .noLabelFloat=${this.selector.number.mode === "slider"}
        class=${classMap({ single: this.selector.number.mode === "box" })}
        .min=${this.selector.number.min}
        .max=${this.selector.number.max}
        .value=${this.value}
        .step=${this.selector.number.step}
        type="number"
        auto-validate
        @value-changed=${this._handleInputChange}
      >
        ${this.selector.number.unit_of_measurement
          ? html`<div slot="suffix">
              ${this.selector.number.unit_of_measurement}
            </div>`
          : ""}
      </paper-input>`;
  }

  private get _value() {
    return this.value || 0;
  }

  private _handleInputChange(ev) {
    ev.stopPropagation();
    const value =
      ev.detail.value === "" || isNaN(ev.detail.value)
        ? undefined
        : Number(ev.detail.value);
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

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      ha-slider {
        flex: 1;
      }
      .single {
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
