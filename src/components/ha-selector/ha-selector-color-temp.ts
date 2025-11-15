import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { ColorTempSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-labeled-slider";
import { generateColorTemperatureGradient } from "../../dialogs/more-info/components/lights/light-color-temp-picker";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
  mired2kelvin,
} from "../../common/color/convert-light-color";

@customElement("ha-selector-color_temp")
export class HaColorTempSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ColorTempSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    let min: number;
    let max: number;

    switch (this.selector.color_temp?.unit) {
      case "kelvin":
        min = this.selector.color_temp?.min ?? DEFAULT_MIN_KELVIN;
        max = this.selector.color_temp?.max ?? DEFAULT_MAX_KELVIN;
        break;
      case "mired":
      default:
        min =
          this.selector.color_temp?.min ??
          this.selector.color_temp?.min_mireds ??
          153;
        max =
          this.selector.color_temp?.max ??
          this.selector.color_temp?.max_mireds ??
          500;
        break;
    }
    const gradient = this._generateTemperatureGradient(
      this.selector.color_temp?.unit ?? "mired",
      min,
      max
    );

    return html`
      <ha-labeled-slider
        style=${styleMap({
          "--ha-slider-background": `linear-gradient( to var(--float-end), ${gradient})`,
        })}
        labeled
        icon="mdi:thermometer"
        .caption=${this.label || ""}
        .min=${min}
        .max=${max}
        .value=${this.value}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .required=${this.required}
        @value-changed=${this._valueChanged}
      ></ha-labeled-slider>
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (unit: "kelvin" | "mired", min: number, max: number) => {
      let gradient;

      switch (unit) {
        case "kelvin":
          gradient = generateColorTemperatureGradient(min, max);
          break;
        case "mired":
          gradient = generateColorTemperatureGradient(
            mired2kelvin(min),
            mired2kelvin(max)
          );
      }

      return gradient;
    }
  );

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: Number((ev.detail as any).value),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_temp": HaColorTempSelector;
  }
}
