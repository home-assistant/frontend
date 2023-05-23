import "@material/mwc-button";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { hs2rgb, rgb2hs } from "../../../../common/color/convert-color";
import { throttle } from "../../../../common/util/throttle";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-hs-color-picker";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-labeled-slider";
import "../../../../components/ha-temp-color-picker";
import {
  getLightCurrentModeRgbColor,
  LightColorMode,
  LightEntity,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../../data/light";
import { HomeAssistant } from "../../../../types";
import { LightColorPickerViewParams } from "./show-view-light-color-picker";

type Mode = "color_temp" | "color";

@customElement("ha-more-info-view-light-color-picker")
class MoreInfoViewLightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public params?: LightColorPickerViewParams;

  @state() private _cwSliderValue?: number;

  @state() private _wwSliderValue?: number;

  @state() private _wvSliderValue?: number;

  @state() private _colorBrightnessSliderValue?: number;

  @state() private _brightnessAdjusted?: number;

  @state() private _hsPickerValue?: [number, number];

  @state() private _ctPickerValue?: number;

  @state() private _mode?: Mode;

  @state() private _modes: Mode[] = [];

  get stateObj() {
    return this.params
      ? (this.hass.states[this.params.entityId] as LightEntity)
      : undefined;
  }

  protected render() {
    if (!this.params || !this.stateObj) {
      return nothing;
    }

    const supportsRgbww = lightSupportsColorMode(
      this.stateObj,
      LightColorMode.RGBWW
    );

    const supportsRgbw =
      !supportsRgbww &&
      lightSupportsColorMode(this.stateObj, LightColorMode.RGBW);

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
              <ha-hs-color-picker
                @value-changed=${this._hsColorChanged}
                @cursor-moved=${this._hsColorCursorMoved}
                .value=${this._hsPickerValue}
              >
              </ha-hs-color-picker>

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

    if (!changedProps.has("params") && !changedProps.has("hass")) {
      return;
    }

    if (changedProps.has("params")) {
      const supportsTemp = lightSupportsColorMode(
        this.stateObj!,
        LightColorMode.COLOR_TEMP
      );

      const supportsColor = lightSupportsColor(this.stateObj!);

      const modes: Mode[] = [];
      if (supportsColor) {
        modes.push("color");
      }
      if (supportsTemp) {
        modes.push("color_temp");
      }

      this._modes = modes;
      this._mode = this.stateObj!.attributes.color_mode
        ? this.stateObj!.attributes.color_mode === LightColorMode.COLOR_TEMP
          ? LightColorMode.COLOR_TEMP
          : "color"
        : this._modes[0];
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
    const hs_color = this._hsPickerValue!;
    const rgb_color = hs2rgb(hs_color);

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
        this.hass.callService("light", "turn_on", {
          entity_id: this.stateObj!.entity_id,
          brightness_pct: brightnessPercentage,
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
        hs_color: [hs_color[0], hs_color[1] * 100],
      });
    }
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
    this.hass.callService("light", "turn_on", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: this._ctPickerValue,
    });
  }, 500);

  private _ctColorChanged(ev: CustomEvent) {
    const ct = ev.detail.value;

    if (isNaN(ct) || this._ctPickerValue === ct) {
      return;
    }

    this._ctPickerValue = ct;

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

        ha-hs-color-picker {
          max-width: 320px;
          min-width: 200px;
          margin: 44px 0 44px 0;
        }

        ha-temp-color-picker {
          max-width: 320px;
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
    "ha-more-info-view-light-color-picker": MoreInfoViewLightColorPicker;
  }
}
