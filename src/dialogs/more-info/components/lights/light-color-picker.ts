import "@material/mwc-button";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { mdiEyedropper } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  hex2rgb,
  hs2rgb,
  hsv2rgb,
  rgb2hex,
  rgb2hs,
  rgb2hsv,
} from "../../../../common/color/convert-color";
import { fireEvent } from "../../../../common/dom/fire_event";
import { throttle } from "../../../../common/util/throttle";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-hs-color-picker";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-labeled-slider";
import "../../../../components/ha-temp-color-picker";
import {
  LightColor,
  getLightCurrentModeRgbColor,
  LightColorMode,
  LightEntity,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import "../../../../components/ha-icon";

export type LightPickerMode = "color_temp" | "color";

declare global {
  interface HASSDomEvents {
    "color-changed": LightColor;
  }
}

@customElement("light-color-picker")
class LightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId!: string;

  @property() public defaultMode?: LightPickerMode;

  @state() private _cwSliderValue?: number;

  @state() private _wwSliderValue?: number;

  @state() private _wvSliderValue?: number;

  @state() private _colorBrightnessSliderValue?: number;

  @state() private _brightnessAdjusted?: number;

  @state() private _hsPickerValue?: [number, number];

  @state() private _ctPickerValue?: number;

  @state() private _mode?: LightPickerMode;

  @state() private _modes: LightPickerMode[] = [];

  get stateObj() {
    return this.hass.states[this.entityId] as LightEntity | undefined;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const supportsRgbww = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGBWW
    );

    const supportsRgbw =
      !supportsRgbww &&
      lightSupportsColorMode(this.stateObj, LightColorMode.RGBW);

    const hexValue = this._hsPickerValue
      ? rgb2hex(
          hsv2rgb([
            this._hsPickerValue[0],
            this._hsPickerValue[1],
            ((this._colorBrightnessSliderValue ?? 100) / 100) * 255,
          ])
        )
      : "";

    return html`
      ${this._modes.length > 1
        ? html`
            <mwc-tab-bar
              .activeIndex=${this._mode ? this._modes.indexOf(this._mode) : 0}
              @MDCTabBar:activated=${this._handleTabChanged}
            >
              ${this._modes.map(
                (value) =>
                  html`<mwc-tab
                    .label=${this.hass.localize(
                      `ui.dialogs.more_info_control.light.color_picker.mode.${value}`
                    )}
                  ></mwc-tab>`
              )}
            </mwc-tab-bar>
          `
        : nothing}
      <div class="content">
        ${this._mode === LightColorMode.COLOR_TEMP
          ? html`
              <p class="color-temp-value">
                ${this._ctPickerValue ? `${this._ctPickerValue} K` : nothing}
              </p>
              <ha-temp-color-picker
                @value-changed=${this._ctColorChanged}
                @cursor-moved=${this._ctColorCursorMoved}
                .min=${this.stateObj.attributes.min_color_temp_kelvin!}
                .max=${this.stateObj.attributes.max_color_temp_kelvin!}
                .value=${this._ctPickerValue}
              >
              </ha-temp-color-picker>
            `
          : nothing}
        ${this._mode === "color"
          ? html`
              <div class="color-container">
                <label class="native-color-picker">
                  <input
                    type="color"
                    .value=${hexValue ?? ""}
                    @input=${this._nativeColorChanged}
                  />
                  <ha-svg-icon .path=${mdiEyedropper}></ha-svg-icon>
                </label>

                <ha-hs-color-picker
                  @value-changed=${this._hsColorChanged}
                  @cursor-moved=${this._hsColorCursorMoved}
                  .value=${this._hsPickerValue}
                  .colorBrightness=${this._colorBrightnessSliderValue != null
                    ? (this._colorBrightnessSliderValue * 255) / 100
                    : undefined}
                  .wv=${this._wvSliderValue != null
                    ? (this._wvSliderValue * 255) / 100
                    : undefined}
                  .ww=${this._wwSliderValue != null
                    ? (this._wwSliderValue * 255) / 100
                    : undefined}
                  .cw=${this._cwSliderValue != null
                    ? (this._cwSliderValue * 255) / 100
                    : undefined}
                  .minKelvin=${this.stateObj.attributes.min_color_temp_kelvin}
                  .maxKelvin=${this.stateObj.attributes.max_color_temp_kelvin}
                >
                </ha-hs-color-picker>
              </div>
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
                : nothing}
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
                : nothing}
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
                : nothing}
            `
          : nothing}
      </div>
    `;
  }

  public _updateSliderValues() {
    const stateObj = this.stateObj;

    if (stateObj?.state === "on") {
      this._brightnessAdjusted = undefined;
      if (
        stateObj.attributes.color_mode === LightColorMode.RGB &&
        stateObj.attributes.rgb_color &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBWW) &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBW)
      ) {
        const maxVal = Math.max(...stateObj.attributes.rgb_color);

        if (maxVal < 255) {
          this._brightnessAdjusted = maxVal;
        }
      }
      this._ctPickerValue =
        stateObj.attributes.color_mode === LightColorMode.COLOR_TEMP
          ? stateObj.attributes.color_temp_kelvin
          : undefined;

      this._wvSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBW &&
        stateObj.attributes.rgbw_color
          ? Math.round((stateObj.attributes.rgbw_color[3] * 100) / 255)
          : undefined;
      this._cwSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBWW &&
        stateObj.attributes.rgbww_color
          ? Math.round((stateObj.attributes.rgbww_color[3] * 100) / 255)
          : undefined;
      this._wwSliderValue =
        stateObj.attributes.color_mode === LightColorMode.RGBWW &&
        stateObj.attributes.rgbww_color
          ? Math.round((stateObj.attributes.rgbww_color[4] * 100) / 255)
          : undefined;

      const currentRgbColor = getLightCurrentModeRgbColor(stateObj);

      this._colorBrightnessSliderValue = currentRgbColor
        ? Math.round((Math.max(...currentRgbColor.slice(0, 3)) * 100) / 255)
        : undefined;

      this._hsPickerValue = currentRgbColor
        ? rgb2hs(currentRgbColor.slice(0, 3) as [number, number, number])
        : undefined;
    } else {
      this._hsPickerValue = [0, 0];
      this._ctPickerValue = undefined;
      this._wvSliderValue = undefined;
      this._cwSliderValue = undefined;
      this._wwSliderValue = undefined;
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("entityId") && !changedProps.has("hass")) {
      return;
    }

    if (changedProps.has("entityId")) {
      const supportsTemp = lightSupportsColorMode(
        this.stateObj!,
        LightColorMode.COLOR_TEMP
      );

      const supportsColor = lightSupportsColor(this.stateObj!);

      const modes: LightPickerMode[] = [];
      if (supportsColor) {
        modes.push("color");
      }
      if (supportsTemp) {
        modes.push("color_temp");
      }

      this._modes = modes;
      this._mode =
        this.defaultMode ??
        (this.stateObj!.attributes.color_mode
          ? this.stateObj!.attributes.color_mode === LightColorMode.COLOR_TEMP
            ? LightColorMode.COLOR_TEMP
            : "color"
          : this._modes[0]);
    }

    this._updateSliderValues();
  }

  private _handleTabChanged(ev: CustomEvent): void {
    const newMode = this._modes[ev.detail.index];
    if (newMode === this._mode) {
      return;
    }
    this._mode = newMode;
  }

  private _hsColorCursorMoved(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    this._hsPickerValue = ev.detail.value;

    this._throttleUpdateColor();
  }

  private _throttleUpdateColor = throttle(() => this._updateColor(), 500);

  private _updateColor() {
    const hs_color = [
      this._hsPickerValue![0],
      this._hsPickerValue![1] * 100,
    ] as [number, number];
    const rgb_color = hs2rgb(this._hsPickerValue!);

    if (
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBWW) ||
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBW)
    ) {
      this._setRgbWColor(
        this._colorBrightnessSliderValue
          ? this._adjustColorBrightness(
              rgb_color,
              (this._colorBrightnessSliderValue * 255) / 100
            )
          : rgb_color
      );
    } else if (lightSupportsColorMode(this.stateObj!, LightColorMode.RGB)) {
      if (this._brightnessAdjusted) {
        const brightnessAdjust = (this._brightnessAdjusted / 255) * 100;
        const brightnessPercentage = Math.round(
          ((this.stateObj!.attributes.brightness || 0) * brightnessAdjust) / 255
        );
        const ajustedRgbColor = this._adjustColorBrightness(
          rgb_color,
          this._brightnessAdjusted,
          true
        );
        this._applyColor(
          { rgb_color: ajustedRgbColor },
          { brightness_pct: brightnessPercentage }
        );
      } else {
        this._applyColor({ rgb_color });
      }
    } else {
      this._applyColor({ hs_color });
    }
  }

  private _nativeColorChanged(ev) {
    const rgb = hex2rgb(ev.currentTarget.value);

    const hsv = rgb2hsv(rgb);

    this._hsPickerValue = [hsv[0], hsv[1]];

    if (
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBW) ||
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBWW)
    ) {
      this._colorBrightnessSliderValue = hsv[2] / 2.55;
    }

    this._throttleUpdateColor();
  }

  private _hsColorChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    this._hsPickerValue = ev.detail.value;

    this._updateColor();
  }

  private _ctColorCursorMoved(ev: CustomEvent) {
    const ct = ev.detail.value;

    if (isNaN(ct) || this._ctPickerValue === ct) {
      return;
    }

    this._ctPickerValue = ct;

    this._throttleUpdateColorTemp();
  }

  private _throttleUpdateColorTemp = throttle(() => {
    this._updateColorTemp();
  }, 500);

  private _ctColorChanged(ev: CustomEvent) {
    const ct = ev.detail.value;

    if (isNaN(ct) || this._ctPickerValue === ct) {
      return;
    }

    this._ctPickerValue = ct;

    this._updateColorTemp();
  }

  private _updateColorTemp() {
    const color_temp_kelvin = this._ctPickerValue!;

    this._applyColor({ color_temp_kelvin });
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
      this._applyColor({
        rgbw_color: rgbw_color as [number, number, number, number],
      });
      return;
    }

    const rgbww_color = rgb || [0, 0, 0, 0, 0];
    while (rgbww_color.length < 5) {
      rgbww_color.push(0);
    }
    rgbww_color[name === "cw" ? 3 : 4] = wv;
    this._applyColor({
      rgbww_color: rgbww_color as [number, number, number, number, number],
    });
  }

  private _applyColor(color: LightColor, params?: Record<string, any>) {
    fireEvent(this, "color-changed", color);
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      ...color,
      ...params,
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
    const isBlack = rgbColor.every((c) => c === 0);
    if (isBlack) {
      rgbColor[0] = 255;
      rgbColor[1] = 255;
      rgbColor[2] = 255;
    }
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
      const rgbwwColor: [number, number, number, number, number] = this
        .stateObj!.attributes.rgbww_color
        ? [...this.stateObj!.attributes.rgbww_color]
        : [0, 0, 0, 0, 0];
      const rgbww_color = rgbColor.concat(rgbwwColor.slice(3)) as [
        number,
        number,
        number,
        number,
        number
      ];
      this._applyColor({ rgbww_color });
    } else if (lightSupportsColorMode(this.stateObj!, LightColorMode.RGBW)) {
      const rgbwColor: [number, number, number, number] = this.stateObj!
        .attributes.rgbw_color
        ? [...this.stateObj!.attributes.rgbw_color]
        : [0, 0, 0, 0];
      const rgbw_color = rgbColor.concat(rgbwColor.slice(3)) as [
        number,
        number,
        number,
        number
      ];
      this._applyColor({ rgbw_color });
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          flex: 1;
        }

        .native-color-picker {
          position: absolute;
          top: 0;
          right: 0;
        }

        .native-color-picker ha-svg-icon {
          pointer-events: none;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          margin: auto;
          padding: 0;
        }

        input[type="color"] {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          border: none;
          outline: none;
          display: block;
          width: var(--mdc-icon-button-size, 48px);
          height: var(--mdc-icon-button-size, 48px);
          padding: calc(
            (var(--mdc-icon-button-size, 48px) - var(--mdc-icon-size, 24px)) / 2
          );
          background-color: transparent;
          border-radius: calc(var(--mdc-icon-button-size, 48px) / 2);
          overflow: hidden;
          cursor: pointer;
          transition: background-color 180ms ease-in-out;
        }

        input[type="color"]:focus-visible,
        input[type="color"]:hover {
          background-color: rgb(127, 127, 127, 0.15);
        }

        input[type="color"]::-webkit-color-swatch-wrapper {
          display: none;
          background: none;
        }

        input[type="color"]::-moz-color-swatch {
          display: none;
        }

        input[type="color"]::-webkit-color-swatch {
          border: none;
        }

        .color-container {
          position: relative;
          max-width: 300px;
          min-width: 200px;
          margin: 0 0 44px 0;
          padding-top: 44px;
        }

        ha-hs-color-picker {
          width: 100%;
        }

        ha-temp-color-picker {
          max-width: 300px;
          min-width: 200px;
          margin: 20px 0 44px 0;
        }

        ha-labeled-slider {
          width: 100%;
        }

        .color-temp-value {
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          height: 24px;
          line-height: 24px;
          letter-spacing: 0.1px;
          margin: 0;
          direction: ltr;
        }

        hr {
          border-color: var(--divider-color);
          border-bottom: none;
          margin: 16px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "light-color-picker": LightColorPicker;
  }
}
