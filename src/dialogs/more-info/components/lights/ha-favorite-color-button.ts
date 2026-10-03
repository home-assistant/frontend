import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { hs2rgb, rgb2hex } from "../../../../common/color/convert-color";
import {
  rgbw2rgb,
  rgbww2rgb,
  temperature2rgb,
} from "../../../../common/color/convert-light-color";
import { luminosity } from "../../../../common/color/rgb";
import type { LightColor, LightEntity } from "../../../../data/light";

@customElement("ha-favorite-color-button")
class HaFavoriteColorButton extends LitElement {
  @property({ attribute: false }) label?: string;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @property({ attribute: false }) color!: LightColor;

  @query("button", true)
  private _button!: HTMLButtonElement;

  public override focus() {
    this._button?.focus();
  }

  private get _rgbColor(): [number, number, number] {
    if (this.color) {
      if ("hs_color" in this.color) {
        return hs2rgb([this.color.hs_color[0], this.color.hs_color[1] / 100]);
      }
      if ("color_temp_kelvin" in this.color) {
        return temperature2rgb(this.color.color_temp_kelvin);
      }
      if ("rgb_color" in this.color) {
        return this.color.rgb_color;
      }
      if ("rgbw_color" in this.color) {
        return rgbw2rgb(this.color.rgbw_color);
      }
      if ("rgbww_color" in this.color) {
        return rgbww2rgb(
          this.color.rgbww_color,
          this.stateObj?.attributes.min_color_temp_kelvin,
          this.stateObj?.attributes.max_color_temp_kelvin
        );
      }
    }

    return [255, 255, 255];
  }

  protected render() {
    const backgroundColor = rgb2hex(this._rgbColor);
    const isLight = luminosity(this._rgbColor) > 0.8;
    const borderColor = isLight ? "var(--divider-color)" : "transparent";

    return html`
      <button
        .disabled=${this.disabled}
        title=${ifDefined(this.label)}
        aria-label=${ifDefined(this.label)}
        style=${styleMap({
          "background-color": backgroundColor,
          "border-color": borderColor,
          "--focus-color": isLight ? borderColor : backgroundColor,
        })}
      ></button>
    `;
  }

  static readonly styles = css`
    :host {
      display: block;
      width: var(--ha-favorite-color-button-size, 40px);
      height: var(--ha-favorite-color-button-size, 40px);
    }
    button {
      background-color: var(--color);
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      border: 1px solid transparent;
      border-radius: var(
        --ha-favorite-color-button-border-radius,
        var(--ha-border-radius-pill)
      );
      padding: 0;
      margin: 0;
      cursor: pointer;
      outline: none;
      transition:
        box-shadow 180ms ease-in-out,
        transform 180ms ease-in-out;
    }
    button:focus-visible {
      box-shadow: 0 0 0 2px var(--focus-color);
    }
    button:active {
      transform: scale(1.1);
    }
    :host([disabled]) {
      pointer-events: none;
    }
    button:disabled {
      filter: grayscale(1) opacity(0.5);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-favorite-color-button": HaFavoriteColorButton;
  }
}
