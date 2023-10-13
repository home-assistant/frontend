import { customElement, property } from "lit/decorators";
import type { ColorTempMiredSelector } from "../../data/selector";
import { BaseTemperatureSelector } from "./ha-selector-color-temp-base";

@customElement("ha-selector-color_temp_mired")
export class HaColorTempSelectorMired extends BaseTemperatureSelector {
  @property() public selector!: ColorTempMiredSelector;

  @property() public minValue: number = 153;

  @property() public maxValue: number = 500;

  updated(changedProperties) {
    if (changedProperties.has("selector")) {
      this.minValue = this.selector.color_temp_mired?.min ?? this.minValue;
      this.maxValue = this.selector.color_temp_mired?.max ?? this.maxValue;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp_mired": HaColorTempSelectorMired;
  }
}
