import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@material/mwc-tab-bar";
import "@material/mwc-tab";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  internalProperty,
  PropertyValues,
} from "lit-element";

import {
  SUPPORT_BRIGHTNESS,
  SUPPORT_COLOR_TEMP,
  SUPPORT_WHITE_VALUE,
  SUPPORT_COLOR,
  SUPPORT_EFFECT,
} from "../../../data/light";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HomeAssistant, LightEntity } from "../../../types";

import "../../../components/ha-attributes";
import "../../../components/ha-color-picker";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-paper-dropdown-menu";
import "../../../components/ha-vertical-range-input";

interface HueSatColor {
  h: number;
  s: number;
}

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @internalProperty() private _brightnessSliderValue = 0;

  @internalProperty() private _ctSliderValue = 0;

  @internalProperty() private _wvSliderValue = 0;

  @internalProperty() private _hueSegments = 24;

  @internalProperty() private _saturationSegments = 8;

  @internalProperty() private _colorPickerColor?: HueSatColor;

  @internalProperty() private _tabIndex = 0;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const supportsBrightness = supportsFeature(
      this.stateObj!,
      SUPPORT_BRIGHTNESS
    );
    const supportsColorTemp = supportsFeature(
      this.stateObj,
      SUPPORT_COLOR_TEMP
    );
    const supportsWhiteValue = supportsFeature(
      this.stateObj,
      SUPPORT_WHITE_VALUE
    );
    const supportsColor = supportsFeature(this.stateObj, SUPPORT_COLOR);
    const supportsEffect =
      supportsFeature(this.stateObj, SUPPORT_EFFECT) &&
      this.stateObj!.attributes.effect_list?.length;

    if (!supportsBrightness && !this._tabIndex) {
      this._tabIndex = 1;
    }

    return html`
      <mwc-tab-bar
        .activeIndex=${this._tabIndex}
        @MDCTabBar:activated=${(ev: CustomEvent) => {
          this._tabIndex = ev.detail.index;
        }}
      >
        ${supportsBrightness
          ? html`<mwc-tab label="Brightness"></mwc-tab>`
          : ""}
        ${supportsColor ||
        supportsColorTemp ||
        supportsEffect ||
        supportsWhiteValue
          ? html`<mwc-tab label="Color"></mwc-tab>`
          : ""}
      </mwc-tab-bar>
      ${this._tabIndex === 0
        ? html`
            ${supportsBrightness
              ? html`
                  <div class="brightness">
                    <div>
                      ${Math.round((this._brightnessSliderValue / 255) * 100)}%
                    </div>
                    <ha-vertical-range-input
                      max="255"
                      .caption=${this.hass.localize("ui.card.light.brightness")}
                      .value=${this._brightnessSliderValue}
                      @value-changed=${this._brightnessChanged}
                    >
                    </ha-vertical-range-input>
                  </div>
                `
              : ""}
          `
        : html`
            ${supportsColorTemp
              ? html`
                  <ha-labeled-slider
                    class="color_temp"
                    icon="hass:thermometer"
                    .caption=${this.hass.localize(
                      "ui.card.light.color_temperature"
                    )}
                    .min=${this.stateObj.attributes.min_mireds}
                    .max=${this.stateObj.attributes.max_mireds}
                    .value=${this._ctSliderValue}
                    @change=${this._colorTempChanged}
                  ></ha-labeled-slider>
                `
              : ""}
            ${supportsWhiteValue
              ? html`
                  <ha-labeled-slider
                    icon="hass:file-word-box"
                    max="255"
                    .caption=${this.hass.localize("ui.card.light.white_value")}
                    .value=${this._wvSliderValue}
                    @change=${this._whiteValueChanged}
                  ></ha-labeled-slider>
                `
              : ""}
            ${supportsColor
              ? html`
                  <div class="color-picker">
                    <ha-icon-button
                      icon="hass:palette"
                      @click=${this._segmentClick}
                    ></ha-icon-button>
                    <ha-color-picker
                      throttle="500"
                      .desiredHsColor=${this._colorPickerColor}
                      .hueSegments=${this._hueSegments}
                      .saturationSegments=${this._saturationSegments}
                      @colorselected=${this._colorPicked}
                    >
                    </ha-color-picker>
                  </div>
                `
              : ""}
            ${supportsEffect
              ? html`
                  <ha-paper-dropdown-menu
                    .label=${this.hass.localize("ui.card.light.effect")}
                  >
                    <paper-listbox
                      slot="dropdown-content"
                      attr-for-selected="item-name"
                      .selected=${this.stateObj.attributes.effect!}
                      @iron-select=${this._effectChanged}
                      >${this.stateObj.attributes.effect_list!.map(
                        (effect: string) => html`
                          <paper-item .itemName=${effect}>${effect}</paper-item>
                        `
                      )}
                    </paper-listbox>
                  </ha-paper-dropdown-menu>
                `
              : ""}
          `}
      <div class="padding"></div>
      ${this.hass.user?.is_admin
        ? html`
            <ha-attributes
              .stateObj=${this.stateObj}
              extraFilters="brightness,color_temp,white_value,effect_list,effect,hs_color,rgb_color,xy_color,min_mireds,max_mireds,entity_id"
            ></ha-attributes>
          `
        : ""}
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    const stateObj = this.stateObj! as LightEntity;
    if (changedProps.has("stateObj") && stateObj.state === "on") {
      this._brightnessSliderValue = stateObj.attributes.brightness;
      this._ctSliderValue = stateObj.attributes.color_temp || 326;
      this._wvSliderValue = stateObj.attributes.white_value;

      if (stateObj.attributes.hs_color) {
        this._colorPickerColor = {
          h: stateObj.attributes.hs_color[0],
          s: stateObj.attributes.hs_color[1] / 100,
        };
      }
    }
  }

  private _effectChanged(ev: CustomEvent) {
    const newVal = ev.detail.value;

    if (!newVal || this.stateObj!.attributes.effect === newVal) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      effect: newVal,
    });
  }

  private _brightnessChanged(ev: CustomEvent) {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness: parseInt(ev.detail.value, 10),
    });
  }

  private _colorTempChanged(ev: CustomEvent) {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp: parseInt((ev.currentTarget as any).value, 10),
    });
  }

  private _whiteValueChanged(ev: CustomEvent) {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      white_value: parseInt((ev.target as any).value, 10),
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

  /**
   * Called when a new color has been picked.
   * should be throttled with the 'throttle=' attribute of the color picker
   */
  private _colorPicked(ev: CustomEvent) {
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      hs_color: [ev.detail.hs.h, ev.detail.hs.s * 100],
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-labeled-slider,
      ha-paper-dropdown-menu,
      .padding {
        width: 100%;
        overflow: hidden;
        padding-top: 16px;
      }

      .brightness {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 16px;
      }

      .brightness div {
        font-size: 20px;
        line-height: 1.2;
        padding: 4px 0;
        font-weight: 500;
        color: var(--secondary-text-color);
      }

      .color_temp {
        --ha-slider-background: -webkit-linear-gradient(
          right,
          rgb(255, 160, 0) 0%,
          white 50%,
          rgb(166, 209, 255) 100%
        );
        /* The color temp minimum value shouldn't be rendered differently. It's not "off". */
        --paper-slider-knob-start-border-color: var(--primary-color);
        --ha-slider-border-radius: 8px;
      }

      .color-picker {
        position: relative;
        max-height: 500px;
      }

      .color-picker ha-icon-button {
        position: absolute;
        top: 5%;
        color: var(--secondary-text-color);
      }

      ha-color-picker {
        --ha-color-picker-wheel-borderwidth: 5;
        --ha-color-picker-wheel-bordercolor: white;
        --ha-color-picker-wheel-shadow: none;
        --ha-color-picker-marker-borderwidth: 2;
        --ha-color-picker-marker-bordercolor: white;
      }

      paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-light": MoreInfoLight;
  }
}
