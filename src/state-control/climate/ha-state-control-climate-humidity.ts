import { mdiMinus, mdiPlus, mdiWaterPercent } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../common/entity/state_active";
import { domainStateColor } from "../../common/entity/state_color";
import { supportsFeature } from "../../common/entity/supports-feature";
import { clamp } from "../../common/number/clamp";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-big-number";
import "../../components/ha-control-circular-slider";
import "../../components/ha-outlined-icon-button";
import "../../components/ha-svg-icon";
import type { ClimateEntity } from "../../data/climate";
import { ClimateEntityFeature } from "../../data/climate";
import { UNAVAILABLE } from "../../data/entity";
import type { HomeAssistant } from "../../types";
import {
  createStateControlCircularSliderController,
  stateControlCircularSliderStyle,
} from "../state-control-circular-slider-style";

@customElement("ha-state-control-climate-humidity")
export class HaStateControlClimateHumidity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: ClimateEntity;

  @property({ attribute: "show-current", type: Boolean })
  public showCurrent = false;

  @property({ type: Boolean, attribute: "prevent-interaction-on-scroll" })
  public preventInteractionOnScroll = false;

  @state() private _targetHumidity?: number;

  private _sizeController = createStateControlCircularSliderController(this);

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._targetHumidity = this.stateObj.attributes.humidity;
    }
  }

  private _step = 1;

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

    if (!this._targetHumidity) {
      return html`
        <p class="label">${this.hass.formatEntityState(this.stateObj)}</p>
      `;
    }

    return html`
      <p class="label">
        ${this.hass.localize("ui.card.climate.humidity_target")}
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
    const formatOptions = {
      maximumFractionDigits: 0,
    };

    return html`
      <ha-big-number
        .value=${humidity}
        unit="%"
        unit-position="bottom"
        .hass=${this.hass}
        .formatOptions=${formatOptions}
      ></ha-big-number>
    `;
  }

  private _renderCurrentHumidity(humidity?: number) {
    if (!this.showCurrent || humidity == null) {
      return html`<p class="label">&nbsp;</p>`;
    }

    return html`
      <p class="label">
        <ha-svg-icon .path=${mdiWaterPercent}></ha-svg-icon>
        <span>
          ${this.hass.formatEntityAttributeValue(
            this.stateObj,
            "current_humidity",
            humidity
          )}
        </span>
      </p>
    `;
  }

  protected render() {
    const supportsTargetHumidity = supportsFeature(
      this.stateObj,
      ClimateEntityFeature.TARGET_HUMIDITY
    );
    const active = stateActive(this.stateObj);

    // Use humidifier state color
    const stateColor = domainStateColor(
      this,
      "humidifier",
      undefined,
      this.stateObj.state,
      active
    );
    const targetHumidity = this._targetHumidity;
    const currentHumidity = this.stateObj.attributes.current_humidity;

    const containerSizeClass = this._sizeController.value
      ? ` ${this._sizeController.value}`
      : "";

    if (
      supportsTargetHumidity &&
      targetHumidity != null &&
      this.stateObj.state !== UNAVAILABLE
    ) {
      return html`
        <div
          class="container${containerSizeClass}"
          style=${styleMap({
            "--state-color": stateColor,
          })}
        >
          <ha-control-circular-slider
            .preventInteractionOnScroll=${this.preventInteractionOnScroll}
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
            ${this._renderLabel()} ${this._renderTarget(targetHumidity)}
            ${this._renderCurrentHumidity(
              this.stateObj.attributes.current_humidity
            )}
          </div>
          ${this._renderButtons()}
        </div>
      `;
    }

    return html`
      <div class="container${containerSizeClass}">
        <ha-control-circular-slider
          .preventInteractionOnScroll=${this.preventInteractionOnScroll}
          .current=${this.stateObj.attributes.current_humidity}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          disabled
        >
        </ha-control-circular-slider>
        <div class="info">
          ${this._renderLabel()}
          ${this._renderCurrentHumidity(
            this.stateObj.attributes.current_humidity
          )}
        </div>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return stateControlCircularSliderStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-climate-humidity": HaStateControlClimateHumidity;
  }
}
