import { css } from "lit";
import { customElement, property } from "lit/decorators";
import type { ColorTempKelvinSelector } from "../../data/selector";
import { BaseTemperatureSelector } from "./ha-selector-color-temp-base";

@customElement("ha-selector-color_temp_kelvin")
export class HaColorTempSelectorKelvin extends BaseTemperatureSelector {
  @property() public selector!: ColorTempKelvinSelector;

  @property() public minValue: number = 2700;

  @property() public maxValue: number = 6000;

  updated(changedProperties) {
    if (changedProperties.has("selector")) {
      this.minValue = this.selector.color_temp_kelvin?.min ?? this.minValue;
      this.maxValue = this.selector.color_temp_kelvin?.max ?? this.maxValue;
    }
  }

  static styles = css`
    ha-labeled-slider {
      --ha-slider-background: linear-gradient(
        to var(--float-end),
        rgb(166, 209, 255) 0%,
        white 50%,
        rgb(255, 160, 0) 100%
      );
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp_kelvin": HaColorTempSelectorKelvin;
  }
}
