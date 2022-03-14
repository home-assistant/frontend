import { mdiPalette } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant } from "../../types";
import { ColorRGBSelector } from "../../data/selector";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-color-picker";
import "../ha-icon-button";

@customElement("ha-selector-color-rgb")
export class HaColorRGBSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: IconSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state() private _saturationSegments = 8;

  @state() private _hueSegments = 24;

  protected render() {
    return html`
      <div class="segmentationContainer">
        <ha-color-picker
          class="color"
          throttle="500"
          .label=${this.label}
          .desiredRgbColor=${this.value}
          .hueSegments=${this._hueSegments}
          .saturationSegments=${this._saturationSegments}
          @colorselected=${this._valueChanged}
        >
        </ha-color-picker>
        <ha-icon-button
          .path=${mdiPalette}
          @click=${this._segmentClick}
          class="segmentationButton"
        ></ha-icon-button>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", {
      value: [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b],
    });
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

  static styles = css`
    .segmentationContainer {
      position: relative;
      max-height: 500px;
      display: flex;
      justify-content: center;
    }

    ha-color-picker {
      --ha-color-picker-wheel-borderwidth: 5;
      --ha-color-picker-wheel-bordercolor: white;
      --ha-color-picker-wheel-shadow: none;
      --ha-color-picker-marker-borderwidth: 2;
      --ha-color-picker-marker-bordercolor: white;
    }

    .segmentationButton {
      position: absolute;
      top: 5%;
      left: 0;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color-rgb": HaColorRGBSelector;
  }
}
