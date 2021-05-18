import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../common/dom/fire_event";
import { NumberSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-slider";

@customElement("ha-selector-number")
export class HaNumberSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: NumberSelector;

  @property() public value?: number;

  @property() public placeholder?: number;

  @property() public label?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`${this.label}
      ${this.selector.number.mode !== "box"
        ? html`<ha-slider
            .min=${this.selector.number.min}
            .max=${this.selector.number.max}
            .value=${this._value}
            .step=${this.selector.number.step ?? 1}
            .disabled=${this.disabled}
            pin
            ignore-bar-touch
            @change=${this._handleSliderChange}
          >
          </ha-slider>`
        : ""}
      <paper-input
        pattern="[0-9]+([\\.][0-9]+)?"
        .label=${this.selector.number.mode !== "box" ? undefined : this.label}
        .placeholder=${this.placeholder}
        .noLabelFloat=${this.selector.number.mode !== "box"}
        class=${classMap({ single: this.selector.number.mode === "box" })}
        .min=${this.selector.number.min}
        .max=${this.selector.number.max}
        .value=${this.value}
        .step=${this.selector.number.step ?? 1}
        .disabled=${this.disabled}
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

  static get styles(): CSSResultGroup {
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
