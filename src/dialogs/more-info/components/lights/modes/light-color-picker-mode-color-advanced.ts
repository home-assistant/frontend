import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  LightColorMode,
  LightEntity,
  lightSupportsColorMode,
} from "../../../../../data/light";
import { HomeAssistant } from "../../../../../types";
import "../../ha-more-info-bar-slider";
import "../../../../../components/ha-labeled-slider";

@customElement("light-color-picker-mode-color-advanced")
export class LightColorPickerModeColorAdvanced extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value = this.stateObj?.attributes?.color_temp_kelvin;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: value,
    });
  }

  private _sliderMoved(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.value = value;
  }

  private _valueFormatter(value?: number) {
    if (value == null) return "-";
    return `${Math.round(value)}K`;
  }

  protected render(): TemplateResult {
    const supportsRgb = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGB
    );
    const supportsRgbw = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGBW
    );
    const supportsRgbww = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGBWW
    );

    return html`
      <div class="sliders">
        ${supportsRgbw || supportsRgbww || supportsRgb
          ? html`<ha-labeled-slider
                .caption=${"Hue"}
                icon="hass:palette"
                max="100"
                pin
              ></ha-labeled-slider>
              <ha-labeled-slider
                .caption=${"Saturation"}
                icon="hass:palette"
                max="100"
                pin
              ></ha-labeled-slider
              ><ha-labeled-slider
                .caption=${this.hass.localize("ui.card.light.color_brightness")}
                icon="hass:brightness-7"
                max="100"
                pin
              ></ha-labeled-slider>`
          : ""}
        ${supportsRgbw
          ? html`
              <ha-labeled-slider
                .caption=${this.hass.localize("ui.card.light.white_value")}
                icon="hass:file-word-box"
                max="100"
                .name=${"wv"}
                pin
              ></ha-labeled-slider>
            `
          : ""}
        ${supportsRgbww
          ? html`
              <ha-labeled-slider
                .caption=${this.hass.localize("ui.card.light.cold_white_value")}
                icon="hass:file-word-box-outline"
                max="100"
                .name=${"cw"}
                pin
              ></ha-labeled-slider>
              <ha-labeled-slider
                .caption=${this.hass.localize("ui.card.light.warm_white_value")}
                icon="hass:file-word-box"
                max="100"
                .name=${"ww"}
                pin
              ></ha-labeled-slider>
            `
          : ""}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .sliders {
        padding: 16px;
      }
      ha-more-info-bar-slider {
        --more-info-slider-bar-background: -webkit-linear-gradient(
          top,
          rgb(166, 209, 255) 0%,
          white 50%,
          rgb(255, 160, 0) 100%
        );
        --more-info-slider-bar-background-opacity: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-picker-mode-color-advanced": LightColorPickerModeColorAdvanced;
  }
}
