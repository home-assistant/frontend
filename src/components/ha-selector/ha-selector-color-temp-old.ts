import { customElement, property } from "lit/decorators";
import type { OldColorTempSelector } from "../../data/selector";
import { BaseTemperatureSelector } from "./ha-selector-color-temp-base";

@customElement("ha-selector-color_temp")
export class HaColorTempSelector extends BaseTemperatureSelector {
  @property() public selector!: OldColorTempSelector;

  @property() public minValue: number = 153;

  @property() public maxValue: number = 500;

  updated(changedProperties) {
    if (changedProperties.has("selector")) {
      this.minValue = this.selector.color_temp?.min_mireds ?? this.minValue;
      this.maxValue = this.selector.color_temp?.max_mireds ?? this.maxValue;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp": HaColorTempSelector;
  }
}
