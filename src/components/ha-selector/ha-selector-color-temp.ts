import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { ColorTempSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-labeled-slider";

@customElement("ha-selector-color_temp")
export class HaColorTempSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: ColorTempSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-labeled-slider
        labeled
        icon="hass:thermometer"
        .caption=${this.label || ""}
        .min=${this.selector.color_temp?.min_mireds ?? 153}
        .max=${this.selector.color_temp?.max_mireds ?? 500}
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

  static styles = css`
    ha-labeled-slider {
      --ha-slider-background: linear-gradient(
        to var(--float-end),
        rgb(255, 160, 0) 0%,
        white 50%,
        rgb(166, 209, 255) 100%
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp": HaColorTempSelector;
  }
}
