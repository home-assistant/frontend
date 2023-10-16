import { html, LitElement } from "lit";
import { property } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-labeled-slider";

export class BaseTemperatureSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property() public minValue: number = 0;

  @property() public maxValue: number = 0;

  protected render() {
    return html`
      <ha-labeled-slider
        labeled
        icon="hass:thermometer"
        .caption=${this.label || ""}
        .min=${this.minValue}
        .max=${this.maxValue}
        .value=${this.value}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .required=${this.required}
        @value-changed=${this._valueChanged}
      ></ha-labeled-slider>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", {
      value: Number((ev.detail as any).value),
    });
  }
}
