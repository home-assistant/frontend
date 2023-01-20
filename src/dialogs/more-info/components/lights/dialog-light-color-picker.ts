import "@material/mwc-button";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import { mdiPalette } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button-toggle-group";
import "../../../../components/ha-color-picker";
import "../../../../components/ha-dialog";
import "../../../../components/ha-header-bar";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-labeled-slider";
import {
  getLightCurrentModeRgbColor,
  LightColorMode,
  LightEntity,
  lightSupportsColor,
  lightSupportsColorMode,
} from "../../../../data/light";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import "../ha-more-info-bar-slider";
import { LightColorPickerDialogParams } from "./show-dialog-light-color-picker";

type Mode = "color_temp" | "color" | "white";

// TODO replace with localize
const LABELS: Record<Mode, string> = {
  color: "Color",
  color_temp: "Temperature",
  white: "White",
};

@customElement("dialog-light-color-picker")
class DialogLightColorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LightColorPickerDialogParams;

  @state() private _ctSliderValue?: number;

  @state() private _cwSliderValue?: number;

  @state() private _wwSliderValue?: number;

  @state() private _wvSliderValue?: number;

  @state() private _colorBrightnessSliderValue?: number;

  @state() private _brightnessAdjusted?: number;

  @state() private _hueSegments = 24;

  @state() private _saturationSegments = 8;

  @state() private _colorPickerColor?: [number, number, number];

  @state() private _mode?: Mode;

  @state() private _modes: Mode[] = [];

  get stateObj() {
    return this._params
      ? (this.hass.states[this._params.entityId] as LightEntity)
      : undefined;
  }

  public async showDialog(params: LightColorPickerDialogParams): Promise<void> {
    this._params = params;

    const supportsTemp = lightSupportsColorMode(
      this.stateObj!,
      LightColorMode.COLOR_TEMP
    );
    const supportsWhite = lightSupportsColorMode(
      this.stateObj!,
      LightColorMode.WHITE
    );

    const modes: Mode[] = [];
    modes.push("color");
    if (supportsTemp) {
      modes.push("color_temp");
    }
    if (supportsWhite) {
      modes.push("white");
    }

    this._modes = modes;
    this._mode =
      this.stateObj!.attributes.color_mode === "color_temp" ||
      this.stateObj!.attributes.color_mode === "white"
        ? this.stateObj!.attributes.color_mode
        : "color";

    this._updateSliderValues();
    await this.updateComplete;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params || !this.stateObj) {
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

    const supportsColor =
      supportsRgbww || supportsRgbw || lightSupportsColor(this.stateObj);

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        hideActions
        .heading=${"Change Color"}
      >
        <div slot="heading">
          <ha-header-bar>
            <ha-icon-button-prev
              slot="navigationIcon"
              dialogAction="cancel"
              .label=${this.hass.localize(
                "ui.dialogs.more_info_control.dismiss"
              )}
            ></ha-icon-button-prev>

            <span slot="title">Change Color</span>
          </ha-header-bar>
        </div>
        <div>
          ${supportsColor && (supportsTemp || supportsWhite)
            ? html`
                <mwc-tab-bar
                  .activeIndex=${this._mode
                    ? this._modes.indexOf(this._mode)
                    : 0}
                  @MDCTabBar:activated=${this._handleTabChanged}
                >
                  ${this._modes.map(
                    (value: string) =>
                      html`<mwc-tab .label=${LABELS[value]}></mwc-tab>`
                  )}
                </mwc-tab-bar>
              `
            : ""}
          <div class="content">
            ${supportsTemp &&
            ((!supportsColor && !supportsWhite) ||
              this._mode === LightColorMode.COLOR_TEMP)
              ? html`
                  <ha-more-info-bar-slider
                    class="color_temp"
                    label=${this.hass.localize(
                      "ui.card.light.color_temperature"
                    )}
                    min="1"
                    max="100"
                    mode="cursor"
                    .value=${this._ctSliderValue}
                    @value-changed=${this._ctSliderChanged}
                    .min=${this.stateObj.attributes.min_color_temp_kelvin!}
                    .max=${this.stateObj.attributes.max_color_temp_kelvin!}
                  >
                  </ha-more-info-bar-slider>
                `
              : ""}
            ${supportsColor &&
            ((!supportsTemp && !supportsWhite) || this._mode === "color")
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
                      .path=${mdiPalette}
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
          </div>
        </div>
      </ha-dialog>
    `;
  }

  public _updateSliderValues() {
    const stateObj = this.stateObj;

    if (stateObj?.state === "on") {
      this._brightnessAdjusted = undefined;
      if (
        stateObj.attributes.color_mode === LightColorMode.RGB &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBWW) &&
        !lightSupportsColorMode(stateObj, LightColorMode.RGBW)
      ) {
        const maxVal = Math.max(...stateObj.attributes.rgb_color!);

        if (maxVal < 255) {
          this._brightnessAdjusted = maxVal;
        }
      }
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
      this._colorPickerColor = [0, 0, 0];
      this._ctSliderValue = undefined;
      this._wvSliderValue = undefined;
      this._cwSliderValue = undefined;
      this._wwSliderValue = undefined;
    }
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!changedProps.has("hass")) {
      return;
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

  private _ctSliderChanged(ev: CustomEvent) {
    const ct = ev.detail.value;

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

  /**
   * Called when a new color has been picked.
   * should be throttled with the 'throttle=' attribute of the color picker
   */
  private _colorPicked(
    ev: CustomEvent<{
      hs: { h: number; s: number };
      rgb: { r: number; g: number; b: number };
    }>
  ) {
    this._colorPickerColor = [
      ev.detail.rgb.r,
      ev.detail.rgb.g,
      ev.detail.rgb.b,
    ];

    if (
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBWW) ||
      lightSupportsColorMode(this.stateObj!, LightColorMode.RGBW)
    ) {
      this._setRgbWColor(
        this._colorBrightnessSliderValue
          ? this._adjustColorBrightness(
              [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b],
              (this._colorBrightnessSliderValue * 255) / 100
            )
          : [ev.detail.rgb.r, ev.detail.rgb.g, ev.detail.rgb.b]
      );
    } else if (lightSupportsColorMode(this.stateObj!, LightColorMode.RGB)) {
      const rgb_color: [number, number, number] = [
        ev.detail.rgb.r,
        ev.detail.rgb.g,
        ev.detail.rgb.b,
      ];
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
        hs_color: [ev.detail.hs.h, ev.detail.hs.s * 100],
      });
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0px;
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
        }

        .content > * {
          width: 100%;
        }

        .segmentationContainer {
          position: relative;
          max-height: 500px;
          display: flex;
          justify-content: center;
        }

        .segmentationButton {
          position: absolute;
          top: 5%;
          left: 0;
          color: var(--secondary-text-color);
        }

        ha-color-picker {
          --ha-color-picker-wheel-borderwidth: 5;
          --ha-color-picker-wheel-bordercolor: white;
          --ha-color-picker-wheel-shadow: none;
          --ha-color-picker-marker-borderwidth: 2;
          --ha-color-picker-marker-bordercolor: white;
        }

        ha-more-info-bar-slider {
          --more-info-slider-bar-height: 290px;
          margin: 20px 0;
        }

        .color_temp {
          --more-info-slider-bar-background: -webkit-linear-gradient(
            top,
            rgb(166, 209, 255) 0%,
            white 50%,
            rgb(255, 160, 0) 100%
          );
          --more-info-slider-bar-background-opacity: 1;
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
    "dialog-light-color-picker": DialogLightColorPicker;
  }
}
