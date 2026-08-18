import { consume, type ContextType } from "@lit/context";
import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
} from "../../../common/color/convert-light-color";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { throttle } from "../../../common/util/throttle";
import "../../../components/ha-control-slider";
import "../../../components/ha-hs-color-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-labeled-slider";
import "../../../components/ha-svg-icon";
import type { ColorEntity } from "../../../data/color";
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity/entity_attributes";
import "../components/ha-more-info-state-header";
import { generateColorTemperatureGradient } from "../components/lights/light-color-temp-picker";
import { moreInfoControlStyle } from "../components/more-info-control-style";

type MainControl = "color" | "color_temp";

@customElement("more-info-color")
class MoreInfoColor extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public stateObj?: ColorEntity;

  @state() private _mainControl?: MainControl;

  @state() private _hsPickerValue?: [number, number];

  @state() private _ctSliderValue?: number;

  @state() private _isInteracting?: boolean;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (!changedProps.has("stateObj") || !this.stateObj) {
      return;
    }

    if (this._mainControl === undefined) {
      this._mainControl =
        this.stateObj.attributes.kind === "white" ? "color_temp" : "color";
    }

    if (this._isInteracting) {
      return;
    }

    const attributes = this.stateObj.attributes;
    this._hsPickerValue = attributes.hs_color
      ? [attributes.hs_color[0], attributes.hs_color[1] / 100]
      : undefined;
    this._ctSliderValue = attributes.color_temp_kelvin ?? undefined;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    const disabled = this.stateObj.state === UNAVAILABLE;
    const hexColor = this.stateObj.attributes.hex_color;
    const brightness = this.stateObj.attributes.brightness;

    return html`
      <ha-more-info-state-header
        .stateObj=${this.stateObj}
      ></ha-more-info-state-header>
      <div class="controls">
        ${
          this._mainControl === "color"
            ? html`
                <ha-hs-color-picker
                  .value=${this._hsPickerValue}
                  .disabled=${disabled}
                  @value-changed=${this._hsColorChanged}
                  @cursor-moved=${this._hsColorCursorMoved}
                ></ha-hs-color-picker>
              `
            : nothing
        }
        ${
          this._mainControl === "color_temp"
            ? html`
                <ha-control-slider
                  touch-action="none"
                  inverted
                  vertical
                  .value=${this._ctSliderValue}
                  .min=${DEFAULT_MIN_KELVIN}
                  .max=${DEFAULT_MAX_KELVIN}
                  mode="cursor"
                  @value-changed=${this._ctColorChanged}
                  @slider-moved=${this._ctColorCursorMoved}
                  .label=${this._localize(
                    "ui.dialogs.more_info_control.color.color_temp"
                  )}
                  style=${styleMap({
                    "--control-slider-color": hexColor,
                    "--gradient": this._generateTemperatureGradient(
                      DEFAULT_MIN_KELVIN,
                      DEFAULT_MAX_KELVIN
                    ),
                  })}
                  .disabled=${disabled}
                  .unit=${DOMAIN_ATTRIBUTES_UNITS.light.color_temp_kelvin}
                  .locale=${this._i18n.locale}
                ></ha-control-slider>
              `
            : nothing
        }
        <ha-icon-button-group>
          <ha-icon-button-toggle
            border-only
            .selected=${this._mainControl === "color"}
            .disabled=${disabled}
            .label=${this._localize("ui.dialogs.more_info_control.color.color")}
            .control=${"color"}
            @click=${this._setMainControl}
          >
            <span class="wheel color"></span>
          </ha-icon-button-toggle>
          <ha-icon-button-toggle
            border-only
            .selected=${this._mainControl === "color_temp"}
            .disabled=${disabled}
            .label=${this._localize(
              "ui.dialogs.more_info_control.color.color_temp"
            )}
            .control=${"color_temp"}
            @click=${this._setMainControl}
          >
            <span class="wheel color-temp"></span>
          </ha-icon-button-toggle>
        </ha-icon-button-group>
        <div class="brightness">
          <ha-labeled-slider
            labeled
            .required=${false}
            .caption=${this._localize(
              "ui.dialogs.more_info_control.color.brightness"
            )}
            icon="mdi:brightness-7"
            min="0"
            max="255"
            .value=${brightness ?? undefined}
            .disabled=${disabled}
            @value-changed=${this._brightnessChanged}
          ></ha-labeled-slider>
          ${
            brightness != null
              ? html`
                  <ha-icon-button
                    .disabled=${disabled}
                    .label=${this._localize(
                      "ui.dialogs.more_info_control.color.clear_brightness"
                    )}
                    @click=${this._clearBrightness}
                  >
                    <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                  </ha-icon-button>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

  private _setMainControl(ev: any) {
    ev.stopPropagation();
    this._mainControl = ev.currentTarget.control;
  }

  private _hsColorCursorMoved(ev: CustomEvent) {
    const value = ev.detail.value;
    this._isInteracting = value !== undefined;

    if (value === undefined) {
      return;
    }

    this._hsPickerValue = value;
    this._throttleSetHsColor();
  }

  private _hsColorChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    this._hsPickerValue = ev.detail.value;
    this._setHsColor();
  }

  private _throttleSetHsColor = throttle(() => this._setHsColor(), 500);

  private _setHsColor() {
    if (!this._hsPickerValue) {
      return;
    }
    this._api.callService("color", "set_color", {
      entity_id: this.stateObj!.entity_id,
      hs_color: [this._hsPickerValue[0], this._hsPickerValue[1] * 100],
    });
  }

  private _ctColorCursorMoved(ev: CustomEvent) {
    const ct = ev.detail.value;
    this._isInteracting = ct !== undefined;

    if (isNaN(ct) || this._ctSliderValue === ct) {
      return;
    }

    this._ctSliderValue = ct;
    this._throttleSetColorTemp();
  }

  private _ctColorChanged(ev: CustomEvent) {
    const ct = ev.detail.value;

    if (isNaN(ct) || this._ctSliderValue === ct) {
      return;
    }

    this._ctSliderValue = ct;
    this._setColorTemp();
  }

  private _throttleSetColorTemp = throttle(() => this._setColorTemp(), 500);

  private _setColorTemp() {
    if (this._ctSliderValue === undefined) {
      return;
    }
    this._api.callService("color", "set_color", {
      entity_id: this.stateObj!.entity_id,
      color_temp_kelvin: this._ctSliderValue,
    });
  }

  private _brightnessChanged(ev: CustomEvent) {
    const value = Number(ev.detail.value);
    if (isNaN(value)) {
      return;
    }
    this._api.callService("color", "set_brightness", {
      entity_id: this.stateObj!.entity_id,
      brightness: Math.round(value),
    });
  }

  private _clearBrightness() {
    this._api.callService("color", "clear_brightness", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
        ha-hs-color-picker {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
        }

        ha-control-slider {
          height: 45vh;
          max-height: 320px;
          min-height: 200px;
          --control-slider-thickness: 130px;
          --control-slider-border-radius: var(--ha-border-radius-6xl);
          --control-slider-color: var(--primary-color);
          --control-slider-background: -webkit-linear-gradient(
            top,
            var(--gradient)
          );
          --control-slider-tooltip-font-size: var(--ha-font-size-xl);
          --control-slider-background-opacity: 1;
        }

        .brightness {
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          max-width: 320px;
        }

        .brightness ha-labeled-slider {
          flex: 1;
        }

        .wheel {
          width: 30px;
          height: 30px;
          flex: none;
          border-radius: var(--ha-border-radius-xl);
        }

        .wheel.color {
          background-image: url("/static/images/color_wheel.png");
          background-size: cover;
        }

        .wheel.color-temp {
          background: linear-gradient(
            0,
            rgb(166, 209, 255) 0%,
            white 50%,
            rgb(255, 160, 0) 100%
          );
        }

        *[disabled] .wheel {
          filter: grayscale(1) opacity(0.5);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-color": MoreInfoColor;
  }
}
