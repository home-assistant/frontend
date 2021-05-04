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
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-color-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-paper-dropdown-menu";
import {
  getLightCurrentModeRgbColor,
  LightColorModes,
  LightEntity,
  lightIsInColorMode,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsDimming,
  SUPPORT_EFFECT,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import "../../../components/ha-button-toggle-group";

const toggleButtons = [
  { label: "Color", value: "color" },
  { label: "Temperature", value: LightColorModes.COLOR_TEMP },
];

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @internalProperty() private _brightnessSliderValue = 0;

  @internalProperty() private _ctSliderValue?: number;

  @internalProperty() private _cwSliderValue?: number;

  @internalProperty() private _wwSliderValue?: number;

  @internalProperty() private _wvSliderValue?: number;

  @internalProperty() private _colorBrightnessSliderValue?: number;

  @internalProperty() private _brightnessAdjusted?: number;

  @internalProperty() private _hueSegments = 24;

  @internalProperty() private _saturationSegments = 8;

  @internalProperty() private _colorPickerColor?: [number, number, number];

  @internalProperty() private _mode?: "color" | LightColorModes.COLOR_TEMP;

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const supportsTemp = lightSupportsColorMode(
      this.stateObj,
      LightColorModes.COLOR_TEMP
    );

    const supportsRgbww = lightSupportsColorMode(
      this.stateObj,
      LightColorModes.RGBWW
    );

    const supportsRgbw =
      !supportsRgbww &&
      lightSupportsColorMode(this.stateObj, LightColorModes.RGBW);

    const supportsColor =
      supportsRgbww || supportsRgbw || lightSupportsColor(this.stateObj);

    return html`
      <div class="content">
        ${lightSupportsDimming(this.stateObj)
          ? html`
              <ha-labeled-slider
                caption=${this.hass.localize("ui.card.light.brightness")}
                icon="hass:brightness-5"
                min="1"
                max="100"
                value=${this._brightnessSliderValue}
                @change=${this._brightnessSliderChanged}
                pin
              ></ha-labeled-slider>
            `
          : ""}
        ${this.stateObj.state === "on"
          ? html`
              ${supportsTemp || supportsColor ? html`<hr />` : ""}
              ${supportsTemp && supportsColor
                ? html`<ha-button-toggle-group
                    fullWidth
                    .buttons=${toggleButtons}
                    .active=${this._mode}
                    @value-changed=${this._modeChanged}
                  ></ha-button-toggle-group>`
                : ""}
              ${supportsTemp &&
              (!supportsColor || this._mode === LightColorModes.COLOR_TEMP)
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
                      pin
                    ></ha-labeled-slider>
                  `
                : ""}
              ${supportsColor && (!supportsTemp || this._mode === "color")
                ? html`
                    <div class="segmentationContainer">
                      <ha-color-picker
                        class="color"
                        @colorselected=${this._colorPicked}
                        .desiredRgbColor=${this._colorPickerColor}
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

                    ${supportsRgbw || supportsRgbww
                      ? html`<ha-labeled-slider
                          .caption=${this.hass.localize(
                            "ui.card.light.color_brightness"
                          )}
                          icon="hass:brightness-7"
                          max="100"
                          .value=${this._colorBrightnessSliderValue ?? 100}
                          @change=${this._colorBrightnessSliderChanged}
                          pin
                        ></ha-labeled-slider>`
                      : ""}
                    ${supportsRgbw
                      ? html`
                          <ha-labeled-slider
                            .caption=${this.hass.localize(
                              "ui.card.light.white_value"
                            )}
                            icon="hass:file-word-box"
                            max="100"
                            .name=${"wv"}
                            .value=${this._wvSliderValue}
                            @change=${this._wvSliderChanged}
                            pin
                          ></ha-labeled-slider>
                        `
                      : ""}
                    ${supportsRgbww
                      ? html`
                          <ha-labeled-slider
                            .caption=${this.hass.localize(
                              "ui.card.light.cold_white_value"
                            )}
                            icon="hass:file-word-box-outline"
                            max="100"
                            .name=${"cw"}
                            .value=${this._cwSliderValue}
                            @change=${this._wvSliderChanged}
                            pin
                          ></ha-labeled-slider>
                          <ha-labeled-slider
                            .caption=${this.hass.localize(
                              "ui.card.light.warm_white_value"
                            )}
                            icon="hass:file-word-box"
                            max="100"
                            .name=${"ww"}
                            .value=${this._wwSliderValue}
                            @change=${this._wvSliderChanged}
                            pin
                          ></ha-labeled-slider>
                        `
                      : ""}
                  `
                : ""}
              ${supportsFeature(this.stateObj, SUPPORT_EFFECT) &&
              this.stateObj!.attributes.effect_list?.length
                ? html`
                    <hr />
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
          extra-filters="brightness,color_temp,white_value,effect_list,effect,hs_color,rgb_color,rgbw_color,rgbww_color,xy_color,min_mireds,max_mireds,entity_id,supported_color_modes,color_mode"
        ></ha-attributes>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (!changedProps.has("stateObj")) {
      return;
    }
    const stateObj = this.stateObj! as LightEntity;
    const oldStateObj = changedProps.get("stateObj") as LightEntity | undefined;

    if (stateObj.state === "on") {
      // Don't change tab when the color mode changes
      if (
        oldStateObj?.entity_id !== stateObj.entity_id ||
        oldStateObj?.state !== stateObj.state
      ) {
        this._mode = lightIsInColorMode(this.stateObj!)
          ? "color"
          : LightColorModes.COLOR_TEMP;
      }

      let brightnessAdjust = 100;
      if (
        stateObj.attributes.color_mode === LightColorModes.RGB &&
        !lightSupportsColorMode(stateObj, LightColorModes.RGBWW) &&
        !lightSupportsColorMode(stateObj, LightColorModes.RGBW)
      ) {
        const maxVal = Math.max(...stateObj.attributes.rgb_color);
        if (maxVal < 255) {
          this._brightnessAdjusted = maxVal;
          brightnessAdjust = (this._brightnessAdjusted / 255) * 100;
        }
      } else {
        this._brightnessAdjusted = undefined;
      }
      this._brightnessSliderValue = Math.round(
        (stateObj.attributes.brightness * brightnessAdjust) / 255
      );
      this._ctSliderValue = stateObj.attributes.color_temp;
      this._wvSliderValue =
        stateObj.attributes.color_mode === LightColorModes.RGBW
          ? Math.round((stateObj.attributes.rgbw_color[3] * 100) / 255)
          : undefined;
      this._cwSliderValue =
        stateObj.attributes.color_mode === LightColorModes.RGBWW
          ? Math.round((stateObj.attributes.rgbww_color[3] * 100) / 255)
          : undefined;
      this._wwSliderValue =
        stateObj.attributes.color_mode === LightColorModes.RGBWW
          ? Math.round((stateObj.attributes.rgbww_color[4] * 100) / 255)
          : undefined;
      this._colorBrightnessSliderValue =
        stateObj.attributes.color_mode === LightColorModes.RGBWW
          ? Math.round(
              (Math.max(...stateObj.attributes.rgbww_color.slice(0, 3)) * 100) /
                255
            )
          : stateObj.attributes.color_mode === LightColorModes.RGBW
          ? Math.round(
              (Math.max(...stateObj.attributes.rgbw_color.slice(0, 3)) * 100) /
                255
            )
          : undefined;

      this._colorPickerColor = getLightCurrentModeRgbColor(stateObj)?.slice(
        0,
        3
      ) as [number, number, number] | undefined;
    } else {
      this._brightnessSliderValue = 0;
    }
  }

  private _modeChanged(ev: CustomEvent) {
    this._mode = ev.detail.value;
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
    const bri = Number((ev.target as any).value);

    if (isNaN(bri)) {
      return;
    }

    if (this._brightnessAdjusted) {
      const rgb =
        this.stateObj!.attributes.rgb_color ||
        ([0, 0, 0] as [number, number, number]);

      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        brightness_pct: bri,
        rgb_color: this._adjustColorBrightness(
          rgb,
          this._brightnessAdjusted,
          true
        ),
      });
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      brightness_pct: bri,
    });
  }

  private _ctSliderChanged(ev: CustomEvent) {
    const ct = Number((ev.target as any).value);

    if (isNaN(ct)) {
      return;
    }

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp: ct,
    });
  }

  private _wvSliderChanged(ev: CustomEvent) {
    const target = ev.target as any;
    let wv = Number(target.value);
    const name = target.name;

    if (isNaN(wv)) {
      return;
    }

    wv = Math.min(255, Math.round((wv * 255) / 100));

    const rgb = getLightCurrentModeRgbColor(this.stateObj!);

    if (name === "wv") {
      const rgbw_color = rgb || [0, 0, 0, 0];
      rgbw_color[3] = wv;
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        rgbw_color,
      });
      return;
    }

    const rgbww_color = rgb || [0, 0, 0, 0, 0];
    while (rgbww_color.length < 5) {
      rgbww_color.push(0);
    }
    rgbww_color[name === "cw" ? 3 : 4] = wv;
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      rgbww_color,
    });
  }

  private _colorBrightnessSliderChanged(ev: CustomEvent) {
    const target = ev.target as any;
    let value = Number(target.value);

    if (isNaN(value)) {
      return;
    }

    value = (value * 255) / 100;

    const rgb = (getLightCurrentModeRgbColor(this.stateObj!)?.slice(0, 3) || [
      255,
      255,
      255,
    ]) as [number, number, number];

    this._setRgbColor(
      this._adjustColorBrightness(
        // first normalize the value
        this._colorBrightnessSliderValue
          ? this._adjustColorBrightness(
              rgb,
              (this._colorBrightnessSliderValue * 255) / 100,
              true
            )
          : rgb,
        value
      )
    );
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

  private _adjustColorBrightness(
    rgbColor: [number, number, number],
    value?: number,
    invert = false
  ) {
    if (value !== undefined && value !== 255) {
      let ratio = value / 255;
      if (invert) {
        ratio = 1 / ratio;
      }
      rgbColor[0] = Math.min(255, Math.round(rgbColor[0] * ratio));
      rgbColor[1] = Math.min(255, Math.round(rgbColor[1] * ratio));
      rgbColor[2] = Math.min(255, Math.round(rgbColor[2] * ratio));
    }
    return rgbColor;
  }

  private _setRgbColor(rgbColor: [number, number, number]) {
    if (lightSupportsColorMode(this.stateObj!, LightColorModes.RGBWW)) {
      const rgbww_color: [number, number, number, number, number] = this
        .stateObj!.attributes.rgbww_color
        ? [...this.stateObj!.attributes.rgbww_color]
        : [0, 0, 0, 0, 0];
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        rgbww_color: rgbColor.concat(rgbww_color.slice(3)),
      });
    } else if (lightSupportsColorMode(this.stateObj!, LightColorModes.RGBW)) {
      const rgbw_color: [number, number, number, number] = this.stateObj!
        .attributes.rgbw_color
        ? [...this.stateObj!.attributes.rgbw_color]
        : [0, 0, 0, 0];
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        rgbw_color: rgbColor.concat(rgbw_color.slice(3)),
      });
    }
  }

  /**
   * Called when a new color has been picked.
   * should be throttled with the 'throttle=' attribute of the color picker
   */
  private _colorPicked(ev: CustomEvent) {
    if (
      lightSupportsColorMode(this.stateObj!, LightColorModes.RGBWW) ||
      lightSupportsColorMode(this.stateObj!, LightColorModes.RGBW)
    ) {
      this._setRgbColor(
        this._colorBrightnessSliderValue
          ? this._adjustColorBrightness(
              [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b],
              (this._colorBrightnessSliderValue * 255) / 100
            )
          : [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b]
      );
    } else if (lightSupportsColorMode(this.stateObj!, LightColorModes.RGB)) {
      const rgb_color = [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b] as [
        number,
        number,
        number
      ];
      if (this._brightnessAdjusted) {
        this.hass.callService("light", "turn_on", {
          entity_id: this.stateObj!.entity_id,
          brightness_pct: this._brightnessSliderValue,
          rgb_color: this._adjustColorBrightness(
            rgb_color,
            this._brightnessAdjusted,
            true
          ),
        });
      } else {
        this.hass.callService("light", "turn_on", {
          entity_id: this.stateObj!.entity_id,
          rgb_color,
        });
      }
    } else {
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        hs_color: [ev.detail.hs.h, ev.detail.hs.s * 100],
      });
    }
  }

  static get styles(): CSSResult {
    return css`
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .content > * {
        width: 100%;
        max-height: 84px;
        overflow: hidden;
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
        margin-bottom: 4px;
      }

      .segmentationContainer {
        position: relative;
        max-height: 500px;
        display: flex;
        justify-content: center;
      }

      ha-button-toggle-group {
        margin-bottom: 8px;
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

      paper-item {
        cursor: pointer;
      }

      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-light": MoreInfoLight;
  }
}
