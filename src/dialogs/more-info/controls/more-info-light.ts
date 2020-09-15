import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-color-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-paper-dropdown-menu";
import {
  SUPPORT_BRIGHTNESS,
  SUPPORT_COLOR,
  SUPPORT_COLOR_TEMP,
  SUPPORT_EFFECT,
  SUPPORT_WHITE_VALUE,
} from "../../../data/light";
import type { HomeAssistant, LightEntity } from "../../../types";

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

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    return html`
      <div
        class="content ${classMap({
          "is-on": this.stateObj.state === "on",
        })}"
      >
        ${supportsFeature(this.stateObj!, SUPPORT_BRIGHTNESS)
          ? html`
              <ha-labeled-slider
                caption=${this.hass.localize("ui.card.light.brightness")}
                icon="hass:brightness-5"
                min="1"
                max="255"
                value=${this._brightnessSliderValue}
                @change=${this._brightnessSliderChanged}
              ></ha-labeled-slider>
            `
          : ""}
        ${this.stateObj.state === "on"
          ? html`
              ${supportsFeature(this.stateObj, SUPPORT_COLOR_TEMP)
                ? html`
                    <ha-labeled-slider
                      class="color_temp"
                      caption=${this.hass.localize(
                        "ui.card.light.color_temperature"
                      )}
                      icon="hass:thermometer"
                      .min=${this.stateObj.attributes.min_mireds}
                      .max=${this.stateObj.attributes.max_mireds}
                      .value=${this._ctSliderValue}
                      @change=${this._ctSliderChanged}
                    ></ha-labeled-slider>
                  `
                : ""}
              ${supportsFeature(this.stateObj, SUPPORT_WHITE_VALUE)
                ? html`
                    <ha-labeled-slider
                      caption=${this.hass.localize("ui.card.light.white_value")}
                      icon="hass:file-word-box"
                      max="255"
                      .value=${this._wvSliderValue}
                      @change=${this._wvSliderChanged}
                    ></ha-labeled-slider>
                  `
                : ""}
              ${supportsFeature(this.stateObj, SUPPORT_COLOR)
                ? html`
                    <div class="segmentationContainer">
                      <ha-color-picker
                        class="color"
                        @colorselected=${this._colorPicked}
                        .desiredHsColor=${this._colorPickerColor}
                        throttle="500"
                        .hueSegments=${this._hueSegments}
                        .saturationSegments=${this._saturationSegments}
                      >
                      </ha-color-picker>
                      <ha-icon-button
                        icon="hass:palette"
                        @click=${this._segmentClick}
                        class="segmentationButton"
                      ></ha-icon-button>
                    </div>
                  `
                : ""}
              ${supportsFeature(this.stateObj, SUPPORT_EFFECT) &&
              this.stateObj!.attributes.effect_list?.length
                ? html`
                    <ha-paper-dropdown-menu
                      .label=${this.hass.localize("ui.card.light.effect")}
                    >
                      <paper-listbox
                        slot="dropdown-content"
                        .selected=${this.stateObj.attributes.effect || ""}
                        @iron-select=${this._effectChanged}
                        attr-for-selected="item-name"
                        >${this.stateObj.attributes.effect_list.map(
                          (effect: string) => html`
                            <paper-item .itemName=${effect}
                              >${effect}</paper-item
                            >
                          `
                        )}
                      </paper-listbox>
                    </ha-paper-dropdown-menu>
                  `
                : ""}
            `
          : ""}
        <ha-attributes
          .stateObj=${this.stateObj}
          extra-filters="brightness,color_temp,white_value,effect_list,effect,hs_color,rgb_color,xy_color,min_mireds,max_mireds,entity_id"
        ></ha-attributes>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    const stateObj = this.stateObj! as LightEntity;
    if (changedProps.has("stateObj") && stateObj.state === "on") {
      this._brightnessSliderValue = stateObj.attributes.brightness;
      this._ctSliderValue = stateObj.attributes.color_temp;
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
    const newVal = ev.detail.item.itemName;

    if (!newVal || this.stateObj!.attributes.effect === newVal) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      effect: newVal,
    });
  }

  private _brightnessSliderChanged(ev: CustomEvent) {
    const bri = parseInt((ev.target as any).value, 10);

    if (isNaN(bri)) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness: bri,
    });
  }

  private _ctSliderChanged(ev: CustomEvent) {
    const ct = parseInt((ev.target as any).value, 10);

    if (isNaN(ct)) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp: ct,
    });
  }

  private _wvSliderChanged(ev: CustomEvent) {
    const wv = parseInt((ev.target as any).value, 10);

    if (isNaN(wv)) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      white_value: wv,
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
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .content.is-on {
        margin-top: -16px;
      }

      .content > * {
        width: 100%;
        max-height: 84px;
        overflow: hidden;
        padding-top: 16px;
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
      }

      .segmentationContainer {
        position: relative;
        max-height: 500px;
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
        color: var(--secondary-text-color);
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
