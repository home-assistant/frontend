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
import { styleMap } from "lit/directives/style-map";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { clamp } from "../../../../common/number/clamp";
import { formatNumber } from "../../../../common/number/format_number";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  WaterHeaterEntity,
  WaterHeaterEntityFeature,
} from "../../../../data/water_heater";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-water_heater-temperature")
export class HaMoreInfoWaterHeaterTemperature extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: WaterHeaterEntity;

  @state() private _targetTemperature?: number;

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetTemperature = this.stateObj.attributes.temperature;
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
    this._targetTemperature = value;
    this._callService();
  }

  private _valueChanging(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._targetTemperature = value;
  }

  private _debouncedCallService = debounce(() => this._callService(), 1000);

  private _callService() {
    this.hass.callService("water_heater", "set_temperature", {
      entity_id: this.stateObj!.entity_id,
      temperature: this._targetTemperature,
    });
  }

  private _handleButton(ev) {
    const step = ev.currentTarget.step as number;

    let temp = this._targetTemperature ?? this._min;
    temp += step;
    temp = clamp(temp, this._min, this._max);

    this._targetTemperature = temp;
    this._debouncedCallService();
  }

  private _renderLabel() {
    return html`
      <p class="action">
        ${this.hass.localize(
          "ui.dialogs.more_info_control.water_heater.target"
        )}
      </p>
    `;
  }

  private _renderButtons() {
    return html`
      <div class="buttons">
        <ha-outlined-icon-button
          .step=${-this._step}
          @click=${this._handleButton}
        >
          <ha-svg-icon .path=${mdiMinus}></ha-svg-icon>
        </ha-outlined-icon-button>
        <ha-outlined-icon-button
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
      WaterHeaterEntityFeature.TARGET_TEMPERATURE
    );

    const mainColor = stateColorCss(this.stateObj);

    if (supportsTargetTemperature && this._targetTemperature != null) {
      return html`
        <div
          class="container"
          style=${styleMap({
            "--main-color": mainColor,
          })}
        >
          <ha-control-circular-slider
            .value=${this._targetTemperature}
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
            <div class="action-container">${this._renderLabel()}</div>
            <div class="temperature-container">
              ${this._renderTargetTemperature(this._targetTemperature)}
            </div>
          </div>
          ${this._renderButtons()}
        </div>
      `;
    }

    return html`
      <div class="container">
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
        color: var(--action-color, inherit);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
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
        --md-outlined-icon-button-icon-size: 24px;
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
    "ha-more-info-water_heater-temperature": HaMoreInfoWaterHeaterTemperature;
  }
}
