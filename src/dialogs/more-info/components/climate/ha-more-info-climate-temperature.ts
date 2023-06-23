import { mdiMinus, mdiPlus } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeValueDisplay } from "../../../../common/entity/compute_attribute_display";
import { computeStateDisplay } from "../../../../common/entity/compute_state_display";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-svg-icon";
import {
  CLIMATE_HVAC_ACTION_TO_MODE,
  CLIMATE_HVAC_MODE_ICONS,
  ClimateEntity,
  ClimateEntityFeature,
} from "../../../../data/climate";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";
import { clamp } from "../../../../common/number/clamp";
import { debounce } from "../../../../common/util/debounce";

type Target = "value" | "low" | "high";

@customElement("ha-more-info-climate-temperature")
export class HaMoreInfoClimateTemperature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  @state() private _selectTargetTemperature: Target = "low";

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    super.updated(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = {
        value: this.stateObj.attributes.temperature,
        low: this.stateObj.attributes.target_temp_low,
        high: this.stateObj.attributes.target_temp_high,
      };
    }
  }

  private get _step() {
    return (
      this.stateObj.attributes.target_temp_step ||
      (this.hass.config.unit_system.temperature.indexOf("F") === -1 ? 0.5 : 1)
    );
  }

  private get _min() {
    return this.stateObj.attributes.min_temp;
  }

  private get _max() {
    return this.stateObj.attributes.max_temp;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const target = ev.type.replace("-changed", "");
    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: value,
    };
    this._selectTargetTemperature = target as Target;
    this._callService(target);
  }

  private _valueChanging(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    const target = ev.type.replace("-changing", "");
    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: value,
    };
    this._selectTargetTemperature = target as Target;
  }

  private _debouncedCallService = debounce(
    (target: Target) => this._callService(target),
    2000
  );

  private _callService(type: string) {
    if (type === "high" || type === "low") {
      this.hass.callService("climate", "set_temperature", {
        entity_id: this.stateObj!.entity_id,
        target_temp_low: this._targetTemperature.low,
        target_temp_high: this._targetTemperature.high,
      });
      return;
    }
    this.hass.callService("climate", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature.value,
    });
  }

  private _handleButton(ev) {
    const target = ev.currentTarget.target as Target;
    const step = ev.currentTarget.step as number;

    const defaultValue = target === "high" ? this._max : this._min;

    let temp = this._targetTemperature[target] ?? defaultValue;
    temp += step;
    temp = clamp(temp, this._min, this._max);
    if (target === "high" && this._targetTemperature.low != null) {
      temp = clamp(temp, this._targetTemperature.low, this._max);
    }
    if (target === "low" && this._targetTemperature.high != null) {
      temp = clamp(temp, this._min, this._targetTemperature.high);
    }

    this._targetTemperature = {
      ...this._targetTemperature,
      [target]: temp,
    };
    this._debouncedCallService(target);
  }

  private _handleSelectTemp(ev) {
    const target = ev.currentTarget.target as Target;
    this._selectTargetTemperature = target;
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

  private _renderTemperatureButtons(target: Target) {
    return html`
      <div class="buttons">
        <ha-icon-button
          .path=${mdiMinus}
          .target=${target}
          .step=${-this._step}
          @click=${this._handleButton}
        ></ha-icon-button>
        <ha-icon-button
          .path=${mdiPlus}
          .target=${target}
          .step=${this._step}
          @click=${this._handleButton}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderTemperature(temperature: number) {
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;
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

    const hvacModes = this.stateObj.attributes.hvac_modes;

    if (supportsTargetTemperature && this._targetTemperature.value != null) {
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
            .inverted=${mode === "cool" ||
            (mode === "off" &&
              hvacModes.length === 2 &&
              hvacModes.includes("cool") &&
              hvacModes.includes("off"))}
            .value=${this._targetTemperature.value}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_temperature}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            ${this._renderHvacAction()}
            ${this._renderTemperature(this._targetTemperature.value)}
            ${this._renderHvacMode()}
          </div>
          ${this._renderTemperatureButtons("value")}
        </div>
      `;
    }

    if (
      supportsTargetTemperatureRange &&
      this._targetTemperature.low != null &&
      this._targetTemperature.high != null
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
            .low=${this._targetTemperature.low}
            .high=${this._targetTemperature.high}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_temperature}
            @low-changed=${this._valueChanged}
            @low-changing=${this._valueChanging}
            @high-changed=${this._valueChanged}
            @high-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            ${this._renderHvacAction()}
            <div class="dual">
              <button
                @click=${this._handleSelectTemp}
                .target=${"low"}
                class=${classMap({
                  selected: this._selectTargetTemperature === "low",
                })}
              >
                ${this._renderTemperature(this._targetTemperature.low)}
              </button>
              <button
                @click=${this._handleSelectTemp}
                .target=${"high"}
                class=${classMap({
                  selected: this._selectTargetTemperature === "high",
                })}
              >
                ${this._renderTemperature(this._targetTemperature.high)}
              </button>
            </div>
            ${this._renderHvacMode()}
          </div>
          ${this._renderTemperatureButtons(this._selectTargetTemperature)}
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
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
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
      .temperature.draft {
        font-style: italic;
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
        padding: 3px 0;
      }
      .dual .temperature .unit {
        font-size: 22px;
        line-height: 34px;
      }
      .dual button {
        outline: none;
        background: none;
        border: none;
        opacity: 0.5;
        transition: opacity 180ms ease-in-out, transform 180ms ease-in-out;
        cursor: pointer;
      }
      .dual button:focus-visible {
        transform: scale(1.1);
      }
      .dual button.selected {
        opacity: 1;
      }
      .buttons {
        position: absolute;
        bottom: 15px;
        left: 0;
        right: 0;
        margin: 0 auto;
        width: 140px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
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
    "ha-more-info-climate-temperature": HaMoreInfoClimateTemperature;
  }
}
