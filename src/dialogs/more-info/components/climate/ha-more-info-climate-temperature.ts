import { mdiMinus, mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeValueDisplay } from "../../../../common/entity/compute_attribute_display";
import { stateActive } from "../../../../common/entity/state_active";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { clamp } from "../../../../common/number/clamp";
import { formatNumber } from "../../../../common/number/format_number";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import {
  CLIMATE_HVAC_ACTION_TO_MODE,
  ClimateEntity,
  ClimateEntityFeature,
} from "../../../../data/climate";
import { UNAVAILABLE } from "../../../../data/entity";
import { HomeAssistant } from "../../../../types";

type Target = "value" | "low" | "high";

@customElement("ha-more-info-climate-temperature")
export class HaMoreInfoClimateTemperature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @state() private _targetTemperature: Partial<Record<Target, number>> = {};

  @state() private _selectTargetTemperature: Target = "low";

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
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
    const action = this.stateObj.attributes.hvac_action;

    const actionLabel = computeAttributeValueDisplay(
      this.hass.localize,
      this.stateObj,
      this.hass.locale,
      this.hass.config,
      this.hass.entities,
      "hvac_action"
    ) as string;

    return html`
      <p class="action">
        ${action && ["preheating", "heating", "cooling"].includes(action)
          ? this.hass.localize(
              "ui.dialogs.more_info_control.climate.target_label",
              { action: actionLabel }
            )
          : action && action !== "off" && action !== "idle"
          ? actionLabel
          : this.hass.localize("ui.dialogs.more_info_control.climate.target")}
      </p>
    `;
  }

  private _renderTemperatureButtons(target: Target, colored?: boolean) {
    const lowColor = stateColorCss(this.stateObj, "heat");
    const highColor = stateColorCss(this.stateObj, "cool");

    const color = colored
      ? target === "high"
        ? highColor
        : lowColor
      : undefined;

    return html`
      <div class="buttons">
        <ha-outlined-icon-button
          style=${styleMap({
            "--md-sys-color-outline": color,
          })}
          .target=${target}
          .step=${-this._step}
          @click=${this._handleButton}
        >
          <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
        </ha-outlined-icon-button>
        <ha-outlined-icon-button
          style=${styleMap({
            "--md-sys-color-outline": color,
          })}
          .target=${target}
          .step=${this._step}
          @click=${this._handleButton}
        >
          <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
        </ha-outlined-icon-button>
      </div>
    `;
  }

  private _renderTargetTemperature(temperature: number) {
    const digits = this._step.toString().split(".")?.[1]?.length ?? 0;
    const formatted = formatNumber(temperature, this.hass.locale, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
    const [temperatureInteger] = formatted.includes(".")
      ? formatted.split(".")
      : formatted.split(",");

    const temperatureDecimal = formatted.replace(temperatureInteger, "");

    return html`
      <p class="temperature">
        <span aria-hidden="true">
          ${temperatureInteger}
          ${digits !== 0
            ? html`<span class="decimal">${temperatureDecimal}</span>`
            : nothing}
          <span class="unit">
            ${this.hass.config.unit_system.temperature}
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
    const active = stateActive(this.stateObj);

    const mainColor = stateColorCss(this.stateObj);
    const lowColor = stateColorCss(this.stateObj, active ? "heat" : "off");
    const highColor = stateColorCss(this.stateObj, active ? "cool" : "off");

    let actionColor: string | undefined;
    if (action && action !== "idle" && action !== "off" && active) {
      actionColor = stateColorCss(
        this.stateObj,
        CLIMATE_HVAC_ACTION_TO_MODE[action]
      );
    }

    const hvacModes = this.stateObj.attributes.hvac_modes;

    if (supportsTargetTemperature && this._targetTemperature.value != null) {
      const hasOnlyCoolMode =
        hvacModes.length === 2 &&
        hvacModes.includes("cool") &&
        hvacModes.includes("off");
      return html`
        <div
          class="container"
          style=${styleMap({
            "--main-color": mainColor,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
            .inverted=${mode === "cool" || hasOnlyCoolMode}
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
            <div class="action-container">${this._renderHvacAction()}</div>
            <div class="temperature-container">
              ${this._renderTargetTemperature(this._targetTemperature.value)}
            </div>
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
            <div class="action-container">${this._renderHvacAction()}</div>
            <div class="temperature-container dual">
              <button
                @click=${this._handleSelectTemp}
                .target=${"low"}
                class=${classMap({
                  selected: this._selectTargetTemperature === "low",
                })}
              >
                ${this._renderTargetTemperature(this._targetTemperature.low)}
              </button>
              <button
                @click=${this._handleSelectTemp}
                .target=${"high"}
                class=${classMap({
                  selected: this._selectTargetTemperature === "high",
                })}
              >
                ${this._renderTargetTemperature(this._targetTemperature.high)}
              </button>
            </div>
          </div>
          ${this._renderTemperatureButtons(this._selectTargetTemperature, true)}
        </div>
      `;
    }

    return html`
      <div
        class="container"
        style=${styleMap({
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
      .temperature-container {
        margin-bottom: 30px;
      }
      .temperature {
        display: inline-flex;
        font-size: 58px;
        line-height: 64px;
        letter-spacing: -0.25px;
        margin: 0;
      }
      .temperature span {
        display: inline-flex;
      }
      .temperature .unit {
        font-size: 24px;
        line-height: 40px;
      }
      .temperature .decimal {
        font-size: 24px;
        line-height: 40px;
        align-self: flex-end;
        margin-right: -18px;
      }
      .action-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 200px;
        height: 48px;
        margin-bottom: 6px;
      }
      .action {
        font-weight: 500;
        text-align: center;
        color: var(--action-color, initial);
      }
      .dual {
        display: flex;
        flex-direction: row;
        gap: 24px;
        margin-bottom: 40px;
      }

      .dual button {
        outline: none;
        background: none;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
        border: none;
        opacity: 0.5;
        padding: 0;
        transition:
          opacity 180ms ease-in-out,
          transform 180ms ease-in-out;
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
        bottom: 10px;
        left: 0;
        right: 0;
        margin: 0 auto;
        width: 120px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .buttons ha-outlined-icon-button {
        --md-outlined-icon-button-container-size: 48px;
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
        --control-circular-slider-low-color: var(
          --low-color,
          var(--disabled-color)
        );
        --control-circular-slider-high-color: var(
          --high-color,
          var(--disabled-color)
        );
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
