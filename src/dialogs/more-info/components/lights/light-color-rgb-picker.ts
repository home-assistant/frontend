import "@material/mwc-button";
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
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-labeled-slider";
import {
  getLightCurrentModeRgbColor,
  LightColor,
  LightColorMode,
  LightEntity,
  lightSupportsColorMode,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";

declare global {
  interface HASSDomEvents {
    "color-changed": LightColor;
  }
}

@customElement("light-color-rgb-picker")
class LightRgbColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: LightEntity;

  @state() private _cwSliderValue?: number;

  @state() private _wwSliderValue?: number;

  @state() private _wvSliderValue?: number;

  @state() private _colorBrightnessSliderValue?: number;

  @state() private _brightnessAdjusted?: number;

  @state() private _hsPickerValue?: [number, number];

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
            labeled
            .caption=${this.hass.localize("ui.card.light.color_brightness")}
            icon="hass:brightness-7"
            min="0"
            max="100"
            .value=${this._colorBrightnessSliderValue}
            @value-changed=${this._colorBrightnessSliderChanged}
          ></ha-labeled-slider>`
        : nothing}
      ${supportsRgbw
        ? html`
            <ha-labeled-slider
              labeled
              .caption=${this.hass.localize("ui.card.light.white_value")}
              icon="hass:file-word-box"
              min="0"
              max="100"
              .name=${"wv"}
              .value=${this._wvSliderValue}
              @value-changed=${this._wvSliderChanged}
            ></ha-labeled-slider>
          `
        : nothing}
      ${supportsRgbww
        ? html`
            <ha-labeled-slider
              labeled
              .caption=${this.hass.localize("ui.card.light.cold_white_value")}
              icon="hass:file-word-box-outline"
              min="0"
              max="100"
              .name=${"cw"}
              .value=${this._cwSliderValue}
              @value-changed=${this._wvSliderChanged}
            ></ha-labeled-slider>
            <ha-labeled-slider
              labeled
              .caption=${this.hass.localize("ui.card.light.warm_white_value")}
              icon="hass:file-word-box"
              min="0"
              max="100"
              .name=${"ww"}
              .value=${this._wwSliderValue}
              @value-changed=${this._wvSliderChanged}
            ></ha-labeled-slider>
          `
        : nothing}
    `;
  }

  public _updateSliderValues() {
    const stateObj = this.stateObj;

    if (stateObj.state === "on") {
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
      this._hsPickerValue = undefined;
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

    this._updateSliderValues();
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

  private _wvSliderChanged(ev: CustomEvent) {
    const target = ev.detail as any;
    let wv = Number(target.value);
    const name = (ev.target as any).name;

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
    const target = ev.detail as any;
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
        number,
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
        number,
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

        .native-color-picker {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 1;
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
        }

        ha-hs-color-picker {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
        }

        ha-labeled-slider {
          width: 100%;
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
    "light-color-rgb-picker": LightRgbColorPicker;
  }
}
