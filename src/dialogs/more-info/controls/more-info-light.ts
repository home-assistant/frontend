import "@material/mwc-list/mwc-list-item";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-attributes";
import "../../../components/ha-button-toggle-group";
import "../../../components/ha-color-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-select";
import {
  getLightCurrentModeRgbColor,
  LightColorMode,
  LightEntity,
  LightEntityFeature,
  lightIsInColorMode,
  lightSupportsColor,
  lightSupportsColorMode,
  lightSupportsBrightness,
} from "../../../data/light";
import type { HomeAssistant } from "../../../types";
import "../components/ha-more-info-bar-slider";
import "../components/ha-more-info-light-brightness";
import "../components/ha-more-info-light-color-temp";
import "../components/ha-more-info-light-color";

const LIGHT_CONTROL_MODES = ["brightness", "color_temp", "color"] as const;
type LightControlMode = typeof LIGHT_CONTROL_MODES[number];

@customElement("more-info-light")
class MoreInfoLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: LightEntity;

  @state() private _brightnessSliderValue = 0;

  @state() private _ctSliderValue?: number;

  @state() private _cwSliderValue?: number;

  @state() private _wwSliderValue?: number;

  @state() private _wvSliderValue?: number;

  @state() private _colorBrightnessSliderValue?: number;

  @state() private _brightnessAdjusted?: number;

  @state() private _hueSegments = 24;

  @state() private _saturationSegments = 8;

  @state() private _colorPickerColor?: [number, number, number];

  @state() private _mode?: LightControlMode = "brightness";

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }

    const supportsTemp = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.COLOR_TEMP
    );

    const supportsWhite = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.WHITE
    );

    const supportsRgbww = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGBWW
    );

    const supportsRgbw =
      !supportsRgbww &&
      lightSupportsColorMode(this.stateObj, LightColorMode.RGBW);

    const supportsBrightness = lightSupportsBrightness(this.stateObj);

    const supportsColor =
      supportsRgbww || supportsRgbw || lightSupportsColor(this.stateObj);

    return html`
      <div class="content">
        ${supportsBrightness && this._mode === LightColorMode.BRIGHTNESS
          ? html`
              <ha-more-info-light-brightness
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-light-brightness>
            `
          : ""}
        ${supportsTemp && this._mode === LightColorMode.COLOR_TEMP
          ? html`
              <ha-more-info-light-color-temp
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-light-color-temp>
            `
          : ""}
        ${supportsTemp && this._mode === "color"
          ? html`
              <ha-more-info-light-color
                .stateObj=${this.stateObj}
                .hass=${this.hass}
              >
              </ha-more-info-light-color>
            `
          : ""}
        ${this.stateObj.state === "on"
          ? html`
              ${supportsColor &&
              ((!supportsTemp && !supportsWhite) || this._mode === "color")
                ? html`
                    ${supportsRgbw || supportsRgbww
                      ? html`<ha-labeled-slider
                          .caption=${this.hass.localize(
                            "ui.card.light.color_brightness"
                          )}
                          icon="hass:brightness-7"
                          max="100"
                          .value=${this._colorBrightnessSliderValue}
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
              <ha-button-toggle-group
                fullWidth
                .buttons=${this._toggleButtons()}
                .active=${this._mode}
                @value-changed=${this._modeChanged}
              ></ha-button-toggle-group>
              ${supportsFeature(this.stateObj, LightEntityFeature.EFFECT) &&
              this.stateObj!.attributes.effect_list?.length
                ? html`
                    <hr />
                    <ha-select
                      .label=${this.hass.localize("ui.card.light.effect")}
                      .value=${this.stateObj.attributes.effect || ""}
                      fixedMenuPosition
                      naturalMenuWidth
                      @selected=${this._effectChanged}
                      @closed=${stopPropagation}
                    >
                      ${this.stateObj.attributes.effect_list.map(
                        (effect: string) => html`
                          <mwc-list-item .value=${effect}>
                            ${effect}
                          </mwc-list-item>
                        `
                      )}
                    </ha-select>
                  `
                : ""}
            `
          : ""}
        <ha-attributes
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          extra-filters="brightness,color_temp,color_temp_kelvin,white_value,effect_list,effect,hs_color,rgb_color,rgbw_color,rgbww_color,xy_color,min_mireds,max_mireds,min_color_temp_kelvin,max_color_temp_kelvin,entity_id,supported_color_modes,color_mode"
        ></ha-attributes>
      </div>
    `;
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    return;

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
          : this.stateObj!.attributes.color_mode;
      }

      let brightnessAdjust = 100;
      this._brightnessAdjusted = undefined;
      if (
        stateObj.attributes.color_mode === LightColorMode.RGB &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBWW) &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBW)
      ) {
        const maxVal = Math.max(...stateObj.attributes.rgb_color!);
        if (maxVal < 255) {
          this._brightnessAdjusted = maxVal;
          brightnessAdjust = (this._brightnessAdjusted / 255) * 100;
        }
      }
      this._brightnessSliderValue = Math.round(
        ((stateObj.attributes.brightness || 0) * brightnessAdjust) / 255
      );
      this._ctSliderValue = stateObj.attributes.color_temp_kelvin;
      this._wvSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBW
          ? Math.round((stateObj.attributes.rgbw_color![3] * 100) / 255)
          : undefined;
      this._cwSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBWW
          ? Math.round((stateObj.attributes.rgbww_color![3] * 100) / 255)
          : undefined;
      this._wwSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBWW
          ? Math.round((stateObj.attributes.rgbww_color![4] * 100) / 255)
          : undefined;

      const currentRgbColor = getLightCurrentModeRgbColor(stateObj);

      this._colorBrightnessSliderValue = currentRgbColor
        ? Math.round((Math.max(...currentRgbColor.slice(0, 3)) * 100) / 255)
        : undefined;

      this._colorPickerColor = currentRgbColor?.slice(0, 3) as [
        number,
        number,
        number
      ];
    } else {
      this._brightnessSliderValue = 0;
    }
  }

  private _toggleButtons = memoizeOne(() =>
    LIGHT_CONTROL_MODES.map((mode) => ({ label: mode, value: mode }))
  );

  private _modeChanged(ev: CustomEvent) {
    this._mode = ev.detail.value;
  }

  private _effectChanged(ev) {
    const newVal = ev.target.value;

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

    this._brightnessSliderValue = bri;

    if (this._mode === LightColorMode.WHITE) {
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        white: Math.min(255, Math.round((bri * 255) / 100)),
      });
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

    this._ctSliderValue = ct;

    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: ct,
    });
  }

  private _wvSliderChanged(ev: CustomEvent) {
    const target = ev.target as any;
    let wv = Number(target.value);
    const name = target.name;

    if (isNaN(wv)) {
      return;
    }

    if (name === "wv") {
      this._wvSliderValue = wv;
    } else if (name === "cw") {
      this._cwSliderValue = wv;
    } else if (name === "ww") {
      this._wwSliderValue = wv;
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

    const oldValue = this._colorBrightnessSliderValue;
    this._colorBrightnessSliderValue = value;

    value = (value * 255) / 100;

    const rgb = (getLightCurrentModeRgbColor(this.stateObj!)?.slice(0, 3) || [
      255, 255, 255,
    ]) as [number, number, number];

    this._setRgbWColor(
      this._adjustColorBrightness(
        // first normalize the value
        oldValue
          ? this._adjustColorBrightness(rgb, (oldValue * 255) / 100, true)
          : rgb,
        value
      )
    );
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

  private _setRgbWColor(rgbColor: [number, number, number]) {
    if (lightSupportsColorMode(this.stateObj!, LightColorMode.RGBWW)) {
      const rgbww_color: [number, number, number, number, number] = this
        .stateObj!.attributes.rgbww_color
        ? [...this.stateObj!.attributes.rgbww_color]
        : [0, 0, 0, 0, 0];
      this.hass.callService("light", "turn_on", {
        entity_id: this.stateObj!.entity_id,
        rgbww_color: rgbColor.concat(rgbww_color.slice(3)),
      });
    } else if (lightSupportsColorMode(this.stateObj!, LightColorMode.RGBW)) {
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

  static get styles(): CSSResultGroup {
    return css`
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .content > * {
        width: 100%;
      }

      .color_temp {
        --ha-slider-background: -webkit-linear-gradient(
          var(--float-end),
          rgb(166, 209, 255) 0%,
          white 50%,
          rgb(255, 160, 0) 100%
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
