import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeValueDisplay } from "../../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../../common/entity/compute_state_display";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-svg-icon";
import {
  ClimateEntity,
  ClimateEntityFeature,
  CLIMATE_HVAC_ACTION_TO_MODE,
  CLIMATE_HVAC_MODE_ICONS,
} from "../../../../data/climate";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-climate-main")
export class HaMoreInfoClimateMain extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @state() private _targetTemperature?: number;

  @state() private _targetLowTemperature?: number;

  @state() private _targetHighTemperature?: number;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    super.updated(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = this.stateObj.attributes.temperature;
      this._targetLowTemperature = this.stateObj.attributes.target_temp_low;
      this._targetHighTemperature = this.stateObj.attributes.target_temp_high;
    }
  }

  private _setTargetValue(type: string, value: number) {
    if (type === "value") {
      this._targetTemperature = value;
    } else if (type === "low") {
      this._targetLowTemperature = value;
    } else if (type === "high") {
      this._targetHighTemperature = value;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const type = ev.type.replace("-changed", "");
    this._setTargetValue(type, value);
    this._callService(type);
  }

  private _valueChanging(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const type = ev.type.replace("-changing", "");
    this._setTargetValue(type, value);
  }

  private _callService(type: string) {
    if (type === "high" || type === "low") {
      this.hass.callService("climate", "set_temperature", {
        entity_id: this.stateObj!.entity_id,
        target_temp_low: this._targetLowTemperature,
        target_temp_high: this._targetHighTemperature,
      });
      return;
    }
    this.hass.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature,
    });
  }

  private _renderTemperature(temperature: number, temperatureStepSize: number) {
    const digits = temperatureStepSize.toString().split(".")?.[1]?.length ?? 0;
    const [temperatureInteger, temperatureDecimal] = temperature
      .toFixed(digits)
      .split(".");

    return html`
      <p class="temperature">
        <span aria-hidden="true">
          ${temperatureInteger}
          <span class="unit">
            ${temperatureDecimal}${this.hass.config.unit_system.temperature}
          </span>
        </span>
        <span class="visually-hidden">
          ${this.stateObj.attributes.temperature}
          ${this.hass.config.unit_system.temperature}
        </span>
      </p>
    `;
  }

  protected render() {
    const supportsTargetTemperature = supportsFeature(
      this.stateObj,
      ClimateEntityFeature.TARGET_TEMPERATURE
    );

    const supportsTargetTemperatureRange = supportsFeature(
      this.stateObj,
      ClimateEntityFeature.TARGET_TEMPERATURE_RANGE
    );

    const temperatureStepSize =
      this.stateObj.attributes.target_temp_step ||
      (this.hass.config.unit_system.temperature.indexOf("F") === -1 ? 0.5 : 1);

    const mode = this.stateObj.state;
    const action = this.stateObj.attributes.hvac_action;

    const sliderColor = stateColorCss(this.stateObj);
    let actionColor: string | undefined;

    if (action && action !== "idle" && action !== "off" && mode !== "off") {
      actionColor = stateColorCss(
        this.stateObj,
        CLIMATE_HVAC_ACTION_TO_MODE[action]
      );
    }

    if (supportsTargetTemperature && this._targetTemperature != null) {
      let backgroundColor: string | undefined;

      if (action && action !== "idle" && action !== "off" && mode !== "off") {
        backgroundColor = stateColorCss(this.stateObj, mode);
      }

      return html`
        <div class="container">
          <ha-control-circular-slider
            style=${styleMap({
              "--slider-color": sliderColor,
              "--background-color": backgroundColor,
              "--halo-color": actionColor,
            })}
            .inverted=${this.stateObj.state === "cool"}
            .value=${this._targetTemperature}
            .min=${this.stateObj.attributes.min_temp}
            .max=${this.stateObj.attributes.max_temp}
            .step=${temperatureStepSize}
            .current=${this.stateObj.attributes.current_temperature}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            <p class="action" style=${styleMap({ color: actionColor })}>
              ${computeAttributeValueDisplay(
                this.hass.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities,
                "hvac_action"
              )}
            </p>
            ${this._renderTemperature(
              this._targetTemperature,
              temperatureStepSize
            )}
            <p class="mode">
              <ha-svg-icon
                .path=${CLIMATE_HVAC_MODE_ICONS[this.stateObj.state]}
              ></ha-svg-icon>
              ${computeStateDisplay(
                this.hass.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities
              )}
            </p>
          </div>
        </div>
      `;
    }

    if (
      supportsTargetTemperatureRange &&
      this._targetLowTemperature != null &&
      this._targetHighTemperature != null
    ) {
      const lowColor = stateColorCss(this.stateObj, "heat");
      const highColor = stateColorCss(this.stateObj, "cool");

      return html`
        <div class="container">
          <ha-control-circular-slider
            style=${styleMap({
              "--low-color": lowColor,
              "--high-color": highColor,
              "--halo-color": actionColor,
            })}
            dual
            .disabled=${this.stateObj!.state === UNAVAILABLE}
            .low=${this._targetLowTemperature}
            .high=${this._targetHighTemperature}
            .min=${this.stateObj.attributes.min_temp}
            .max=${this.stateObj.attributes.max_temp}
            .current=${this.stateObj.attributes.current_temperature}
            .step=${temperatureStepSize}
            @low-changed=${this._valueChanged}
            @low-changing=${this._valueChanging}
            @high-changed=${this._valueChanged}
            @high-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            <p class="action" style=${styleMap({ color: actionColor })}>
              ${computeAttributeValueDisplay(
                this.hass.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities,
                "hvac_action"
              )}
            </p>
            <div class="dual">
              ${this._renderTemperature(
                this._targetLowTemperature,
                temperatureStepSize
              )}
              ${this._renderTemperature(
                this._targetHighTemperature,
                temperatureStepSize
              )}
            </div>
            <p class="mode">
              <ha-svg-icon
                .path=${CLIMATE_HVAC_MODE_ICONS[this.stateObj.state]}
              ></ha-svg-icon>
              ${computeStateDisplay(
                this.hass.localize,
                this.stateObj,
                this.hass.locale,
                this.hass.config,
                this.hass.entities
              )}
            </p>
          </div>
        </div>
      `;
    }

    return html`
      <div class="container">
        <ha-control-circular-slider
          style=${styleMap({
            "--background-color": sliderColor,
            "--halo-color": actionColor,
          })}
          .current=${this.stateObj.attributes.current_temperature}
          disabled
        >
        </ha-control-circular-slider>
        <div class="info">
          <p class="action" style=${styleMap({ color: actionColor })}>
            ${computeAttributeValueDisplay(
              this.hass.localize,
              this.stateObj,
              this.hass.locale,
              this.hass.config,
              this.hass.entities,
              "hvac_action"
            )}
          </p>
          <p class="mode">
            <ha-svg-icon
              .path=${CLIMATE_HVAC_MODE_ICONS[this.stateObj.state]}
            ></ha-svg-icon>
            ${computeStateDisplay(
              this.hass.localize,
              this.stateObj,
              this.hass.locale,
              this.hass.config,
              this.hass.entities
            )}
          </p>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .container {
        position: relative;
      }
      .info {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        font-size: 16px;
        line-height: 24px;
        letter-spacing: 0.1px;
      }
      .transparent {
        opacity: 0;
      }

      .info * {
        margin: 0;
        pointer-events: auto;
      }
      .temperature {
        display: inline-flex;
        font-size: 58px;
        line-height: 64px;
        letter-spacing: -0.25px;
        margin: 12px 0;
      }
      .temperature span {
        display: inline-flex;
      }
      .temperature .unit {
        font-size: 24px;
        line-height: 40px;
      }
      .action,
      .mode {
        font-weight: 500;
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .mode ha-svg-icon {
        --mdc-icon-size: 20px;
        margin-right: 8px;
      }
      .dual {
        display: flex;
        flex-direction: row;
        gap: 24px;
      }
      .dual .temperature {
        font-size: 45px;
        line-height: 52px;
        margin: 18px 0;
      }
      .dual .temperature .unit {
        font-size: 22px;
        line-height: 34px;
      }
      .visually-hidden {
        position: absolute;
        overflow: hidden;
        clip: rect(0 0 0 0);
        height: 1px;
        width: 1px;
        margin: -1px;
        padding: 0;
        border: 0;
      }
      ha-control-circular-slider {
        --control-circular-slider-color: var(
          --slider-color,
          var(--disabled-color)
        );
        --control-circular-slider-background: var(
          --background-color,
          var(--disabled-color)
        );
        --control-circular-slider-low-color: var(
          --low-color,
          var(--control-circular-slider-color)
        );
        --control-circular-slider-high-color: var(
          --high-color,
          var(--control-circular-slider-color)
        );
        --control-circular-slider-background-opacity: 0.24;
      }
      ha-control-circular-slider::after {
        display: block;
        content: "";
        position: absolute;
        top: -10%;
        left: -10%;
        right: -10%;
        bottom: -10%;
        background: radial-gradient(
          50% 50% at 50% 50%,
          var(--halo-color, transparent) 0%,
          transparent 100%
        );
        opacity: 0.15;
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-climate-main": HaMoreInfoClimateMain;
  }
}
