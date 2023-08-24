import { mdiMinus, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../../../common/entity/state_active";
import { domainStateColorProperties } from "../../../../common/entity/state_color";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { clamp } from "../../../../common/number/clamp";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import { ClimateEntity, ClimateEntityFeature } from "../../../../data/climate";
import { UNAVAILABLE } from "../../../../data/entity";
import { computeCssVariable } from "../../../../resources/css-variables";
import { HomeAssistant } from "../../../../types";
import { moreInfoControlCircularSliderStyle } from "../ha-more-info-control-circular-slider-style";

@customElement("ha-more-info-climate-humidity")
export class HaMoreInfoClimateHumidity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @state() private _targetHumidity?: number;

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetHumidity = this.stateObj.attributes.humidity;
    }
  }

  private get _step() {
    return 1;
  }

  private get _min() {
    return this.stateObj.attributes.min_humidity ?? 0;
  }

  private get _max() {
    return this.stateObj.attributes.max_humidity ?? 100;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._targetHumidity = value;
    this._callService();
  }

  private _valueChanging(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._targetHumidity = value;
  }

  private _debouncedCallService = debounce(() => this._callService(), 1000);

  private _callService() {
    this.hass.callService("climate", "set_humidity", {
      entity_id: this.stateObj!.entity_id,
      humidity: this._targetHumidity,
    });
  }

  private _handleButton(ev) {
    const step = ev.currentTarget.step as number;

    let humidity = this._targetHumidity ?? this._min;
    humidity += step;
    humidity = clamp(humidity, this._min, this._max);

    this._targetHumidity = humidity;
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

    return html`
      <p class="label">
        ${this.hass.localize(
          "ui.dialogs.more_info_control.climate.humidity_target"
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

  private _renderTarget(humidity: number) {
    const rounded = Math.round(humidity);
    const formatted = this.hass.formatEntityAttributeValue(
      this.stateObj,
      "humidity",
      rounded
    );

    return html`
      <div class="target">
        <p class="value" aria-hidden="true">
          ${rounded}<span class="unit">%</span>
        </p>
        <p class="visually-hidden">${formatted}</p>
      </div>
    `;
  }

  protected render() {
    const supportsTargetHumidity = supportsFeature(
      this.stateObj,
      ClimateEntityFeature.TARGET_HUMIDITY
    );
    const active = stateActive(this.stateObj);

    // Use humidifier state color
    const stateColor = computeCssVariable(
      domainStateColorProperties(
        "humidifier",
        this.stateObj,
        active ? "on" : "off"
      )
    );

    const targetHumidity = this._targetHumidity;
    const currentHumidity = this.stateObj.attributes.current_humidity;

    if (
      supportsTargetHumidity &&
      targetHumidity != null &&
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
            .value=${this._targetHumidity}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${currentHumidity}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            <div class="label-container">${this._renderLabel()}</div>
            <div class="target-container">
              ${this._renderTarget(targetHumidity)}
            </div>
          </div>
          ${this._renderButtons()}
        </div>
      `;
    }

    return html`
      <div class="container">
        <ha-control-circular-slider
          .current=${this.stateObj.attributes.current_humidity}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          disabled
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
        .target-container {
          margin-bottom: 30px;
        }
        .target .value {
          font-size: 58px;
          line-height: 1;
          letter-spacing: -0.25px;
        }
        .target .value .unit {
          font-size: 0.4em;
          line-height: 1;
          margin-left: 2px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-climate-humidity": HaMoreInfoClimateHumidity;
  }
}
