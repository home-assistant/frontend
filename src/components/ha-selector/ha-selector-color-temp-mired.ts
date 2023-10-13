import { css } from "lit";
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

  static styles = css`
    ha-labeled-slider {
      --ha-slider-background: -webkit-linear-gradient(
        var(--float-end),
        rgb(255, 160, 0) 0%,
        white 50%,
        rgb(166, 209, 255) 100%
      );
      --paper-slider-knob-start-border-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp_mired": HaColorTempSelectorMired;
  }
}
