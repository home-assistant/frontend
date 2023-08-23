import { css, CSSResultGroup, html, LitElement } from "lit";
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
import type { HaOutlinedIconButton } from "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import { LightColor, LightEntity } from "../../../../data/light";

@customElement("ha-favorite-color-button")
class MoreInfoViewLightColorPicker extends LitElement {
  public override focus() {
    this._button?.focus();
  }

  @property({ attribute: false }) label?: string;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property() stateObj?: LightEntity;

  @property() color!: LightColor;

  @query("ha-outlined-icon-button", true)
  private _button?: HaOutlinedIconButton;

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
    const iconColor = isLight
      ? ([33, 33, 33] as [number, number, number])
      : ([255, 255, 255] as [number, number, number]);
    const hexIconColor = rgb2hex(iconColor);
    const rgbIconColor = iconColor.join(", ");

    return html`
      <ha-outlined-icon-button
        no-ripple
        .disabled=${this.disabled}
        title=${ifDefined(this.label)}
        aria-label=${ifDefined(this.label)}
        style=${styleMap({
          "background-color": backgroundColor,
          "--icon-color": hexIconColor,
          "--rgb-icon-color": rgbIconColor,
        })}
      ></ha-outlined-icon-button>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: block;
        }
        ha-outlined-icon-button {
          --ha-icon-display: block;
          --md-sys-color-on-surface: var(
            --icon-color,
            var(--secondary-text-color)
          );
          --md-sys-color-on-surface-variant: var(
            --icon-color,
            var(--secondary-text-color)
          );
          --md-sys-color-on-surface-rgb: var(
            --rgb-icon-color,
            var(--rgb-secondary-text-color)
          );
          --md-sys-color-outline: var(--divider-color);
          --md-ripple-focus-color: 0;
          --md-ripple-hover-opacity: 0;
          --md-ripple-pressed-opacity: 0;
          border-radius: 9999px;
        }
        :host([disabled]) {
          pointer-events: none;
        }
        ha-outlined-icon-button[disabled] {
          filter: grayscale(1) opacity(0.5);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-favorite-color-button": MoreInfoViewLightColorPicker;
  }
}
