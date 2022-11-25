import { mdiPalette } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-icon-button";
import { LightEntity } from "../../../data/light";
import { HomeAssistant } from "../../../types";
import "./ha-more-info-bar-slider";

@customElement("ha-more-info-light-color")
export class HaMoreInfoLightColor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() value?: [number, number, number];

  @state() private _hueSegments = 24;

  @state() private _saturationSegments = 8;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      this.value = this.stateObj?.attributes?.rgb_color;
    }
  }

  private _segmentClick() {
    if (this._hueSegments === 24 && this._saturationSegments === 8) {
      this._hueSegments = 0;
      this._saturationSegments = 0;
    } else {
      this._hueSegments = 24;
      this._saturationSegments = 8;
    }
  }

  private _colorPicked(
    ev: CustomEvent<{
      hs: { h: number; s: number };
      rgb: { r: number; g: number; b: number };
    }>
  ) {
    const value = [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b];

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      rgb_color: value,
    });
  }

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <ha-color-picker
          class="color"
          @colorselected=${this._colorPicked}
          .desiredRgbColor=${this.value}
          throttle="500"
          .hueSegments=${this._hueSegments}
          .saturationSegments=${this._saturationSegments}
        >
        </ha-color-picker>
        <ha-icon-button
          .path=${mdiPalette}
          @click=${this._segmentClick}
          class="button"
        ></ha-icon-button>
        <p>Color</p>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        position: relative;
        max-height: 500px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      ha-color-picker {
        --ha-color-picker-wheel-borderwidth: 5;
        --ha-color-picker-wheel-bordercolor: white;
        --ha-color-picker-wheel-shadow: none;
        --ha-color-picker-marker-borderwidth: 2;
        --ha-color-picker-marker-bordercolor: white;
      }

      .button {
        position: absolute;
        top: 5%;
        left: 0;
        color: var(--secondary-text-color);
      }

      p {
        font-weight: 500;
        font-size: 14px;
        line-height: 20px;
        text-align: center;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-light-color": HaMoreInfoLightColor;
  }
}
