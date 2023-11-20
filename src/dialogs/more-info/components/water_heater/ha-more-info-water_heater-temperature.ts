import { mdiMinus, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { UNIT_F } from "../../../../common/const";
import { stateActive } from "../../../../common/entity/state_active";
import { stateColorCss } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { clamp } from "../../../../common/number/clamp";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-big-number";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  WaterHeaterEntity,
  WaterHeaterEntityFeature,
} from "../../../../data/water_heater";
import { HomeAssistant } from "../../../../types";
import { moreInfoControlCircularSliderStyle } from "../ha-more-info-control-circular-slider-style";

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
      (this.hass.config.unit_system.temperature === UNIT_F ? 1 : 0.5)
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
    if (this.stateObj.state === UNAVAILABLE) {
      return html`
        <p class="label disabled">
          ${this.hass.formatEntityState(this.stateObj, UNAVAILABLE)}
        </p>
      `;
    }

    if (
      !supportsFeature(
        this.stateObj,
        WaterHeaterEntityFeature.TARGET_TEMPERATURE
      )
    ) {
      return html`
        <p class="label">${this.hass.formatEntityState(this.stateObj)}</p>
      `;
    }

    return html`
      <p class="label">
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
    const formatOptions: Intl.NumberFormatOptions = {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    };
    return html`
      <ha-big-number
        .value=${temperature}
        .unit=${this.hass.config.unit_system.temperature}
        .hass=${this.hass}
        .formatOptions=${formatOptions}
      ></ha-big-number>
    `;
  }

  protected render() {
    const supportsTargetTemperature = supportsFeature(
      this.stateObj,
      WaterHeaterEntityFeature.TARGET_TEMPERATURE
    );

    const stateColor = stateColorCss(this.stateObj);
    const active = stateActive(this.stateObj);

    if (
      supportsTargetTemperature &&
      this._targetTemperature != null &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <div
          class="container"
          style=${styleMap({
            "--state-color": stateColor,
          })}
        >
          <ha-control-circular-slider
            .inactive=${!active}
            .value=${this._targetTemperature}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_temperature}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            <div class="label-container">${this._renderLabel()}</div>
            <div class="temperature-container">
              ${this._renderTargetTemperature(this._targetTemperature)}
            </div>
          </div>
          ${this._renderButtons()}
        </div>
      `;
    }

    return html`
      <div
        class="container"
        style=${styleMap({
          "--state-color": stateColor,
        })}
      >
        <ha-control-circular-slider
          mode="full"
          .current=${this.stateObj.attributes.current_temperature}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          readonly
          .disabled=${!active}
        >
        </ha-control-circular-slider>
        <div class="info">
          <div class="label-container">${this._renderLabel()}</div>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlCircularSliderStyle,
      css`
        /* Elements */
        .temperature-container {
          margin-bottom: 30px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-water_heater-temperature": HaMoreInfoWaterHeaterTemperature;
  }
}
