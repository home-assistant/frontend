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

  private _renderHvacAction() {
    return html`
      <p class="action">
        ${computeAttributeValueDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.locale,
          this.hass.config,
          this.hass.entities,
          "hvac_action"
        )}
      </p>
    `;
  }

  private _renderHvacMode() {
    return html`
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
    `;
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

    const mainColor = stateColorCss(this.stateObj);
    const lowColor = stateColorCss(this.stateObj, "heat");
    const highColor = stateColorCss(this.stateObj, "cool");

    let actionColor: string | undefined;
    let backgroundColor: string | undefined;
    if (action && action !== "idle" && action !== "off" && mode !== "off") {
      actionColor = stateColorCss(
        this.stateObj,
        CLIMATE_HVAC_ACTION_TO_MODE[action]
      );
      backgroundColor = stateColorCss(this.stateObj, mode);
    }

    if (supportsTargetTemperature && this._targetTemperature != null) {
      return html`
        <div
          class="container"
          style=${styleMap({
            "--main-color": mainColor,
            "--background-color": backgroundColor,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
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
            ${this._renderHvacAction()}
            ${this._renderTemperature(
              this._targetTemperature,
              temperatureStepSize
            )}
            ${this._renderHvacMode()}
          </div>
        </div>
      `;
    }

    if (
      supportsTargetTemperatureRange &&
      this._targetLowTemperature != null &&
      this._targetHighTemperature != null
    ) {
      return html`
        <div
          class="container"
          style=${styleMap({
            "--low-color": lowColor,
            "--high-color": highColor,
            "--action-color": actionColor,
            "--low-opacity": action === "cooling" ? 0.3 : undefined,
            "--high-opacity": action === "heating" ? 0.3 : undefined,
          })}
        >
          <ha-control-circular-slider
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
            ${this._renderHvacAction()}
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
            ${this._renderHvacMode()}
          </div>
        </div>
      `;
    }

    return html`
      <div
        class="container"
        style=${styleMap({
          "--background-color": backgroundColor,
          "--action-color": actionColor,
        })}
      >
        <ha-control-circular-slider
          .current=${this.stateObj.attributes.current_temperature}
          disabled
        >
        </ha-control-circular-slider>
        <div class="info">
          ${this._renderHvacAction()}${this._renderHvacMode()}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      /* Layout */
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
      .info * {
        margin: 0;
        pointer-events: auto;
      }
      /* Elements */
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
      .mode {
        font-weight: 500;
        display: flex;
        flex-direction: row;
        align-items: center;
      }
      .action {
        font-weight: 500;
        display: flex;
        flex-direction: row;
        align-items: center;
        color: var(--action-color, initial);
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
      /* Dual override */
      .dual .temperature {
        font-size: 45px;
        line-height: 52px;
        margin: 18px 0;
      }
      .dual .temperature .unit {
        font-size: 22px;
        line-height: 34px;
      }
      /* Accessibility */
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
      /* Slider */
      ha-control-circular-slider {
        --control-circular-slider-color: var(
          --main-color,
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
        --control-circular-slider-low-color-opacity: var(--low-opacity, 1);
        --control-circular-slider-high-color-opacity: var(--high-opacity, 1);
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
          var(--action-color, transparent) 0%,
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
