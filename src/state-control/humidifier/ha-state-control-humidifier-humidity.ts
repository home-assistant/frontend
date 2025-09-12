import { mdiMinus, mdiPlus, mdiThermostat, mdiWaterPercent } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../common/entity/state_active";
import { stateColor } from "../../common/entity/state_color";
import { clamp } from "../../common/number/clamp";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-big-number";
import "../../components/ha-control-circular-slider";
import "../../components/ha-outlined-icon-button";
import "../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../data/entity_attributes";
import type { HumidifierEntity } from "../../data/humidifier";
import {
  HUMIDIFIER_ACTION_MODE,
  HumidifierEntityDeviceClass,
} from "../../data/humidifier";
import type { HomeAssistant } from "../../types";
import {
  createStateControlCircularSliderController,
  stateControlCircularSliderStyle,
} from "../state-control-circular-slider-style";

@customElement("ha-state-control-humidifier-humidity")
export class HaStateControlHumidifierHumidity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HumidifierEntity;

  @property({ attribute: "show-secondary", type: Boolean })
  public showSecondary = false;

  @property({ attribute: "use-current-as-primary", type: Boolean })
  public showCurrentAsPrimary = false;

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
    this.hass.callService("humidifier", "set_humidity", {
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

    const action = this.stateObj.attributes.action;

    const isHumidityDisplayed =
      (this.stateObj.attributes.current_humidity != null &&
        this.showCurrentAsPrimary) ||
      (this._targetHumidity != null && !this.showCurrentAsPrimary);

    return html`
      <p class="label">
        ${action && action !== "off"
          ? this.hass.formatEntityAttributeValue(this.stateObj, "action")
          : isHumidityDisplayed
            ? this.hass.formatEntityState(this.stateObj)
            : nothing}
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

  private _renderPrimary() {
    const currentHumidity = this.stateObj.attributes.current_humidity;

    if (currentHumidity != null && this.showCurrentAsPrimary) {
      return this._renderCurrent(currentHumidity, "big");
    }

    if (this._targetHumidity != null && !this.showCurrentAsPrimary) {
      return this._renderTarget(this._targetHumidity!, "big");
    }

    if (this.stateObj.state !== UNAVAILABLE) {
      return html`
        <p class="primary-state">
          ${this.hass.formatEntityState(this.stateObj)}
        </p>
      `;
    }

    return nothing;
  }

  private _renderSecondary() {
    if (!this.showSecondary) {
      return html`<p class="label"></p>`;
    }

    const currentHumidity = this.stateObj.attributes.current_humidity;

    if (currentHumidity != null && !this.showCurrentAsPrimary) {
      return html`
        <p class="label">
          <ha-svg-icon .path=${mdiWaterPercent}></ha-svg-icon>
          ${this._renderCurrent(currentHumidity, "normal")}
        </p>
      `;
    }

    if (this._targetHumidity != null && this.showCurrentAsPrimary) {
      return html`
        <p class="label">
          <ha-svg-icon .path=${mdiThermostat}></ha-svg-icon>
          ${this._renderCurrent(this._targetHumidity, "normal")}
        </p>
      `;
    }

    return html`<p class="label"></p>`;
  }

  private _renderTarget(humidity: number, style: "normal" | "big") {
    const formatOptions: Intl.NumberFormatOptions = {
      maximumFractionDigits: 0,
    };
    if (style === "big") {
      return html`
        <ha-big-number
          .value=${humidity}
          .unit=${DOMAIN_ATTRIBUTES_UNITS.humidifier.current_humidity}
          .hass=${this.hass}
          .formatOptions=${formatOptions}
          unit-position="bottom"
        ></ha-big-number>
      `;
    }

    return html`
      ${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "humidity",
        humidity
      )}
    `;
  }

  private _renderCurrent(humidity: number, style: "normal" | "big") {
    const formatOptions: Intl.NumberFormatOptions = {
      maximumFractionDigits: 1,
    };
    if (style === "big") {
      return html`
        <ha-big-number
          .value=${humidity}
          .unit=${DOMAIN_ATTRIBUTES_UNITS.humidifier.current_humidity}
          .hass=${this.hass}
          .formatOptions=${formatOptions}
          unit-position="bottom"
        ></ha-big-number>
      `;
    }

    return html`
      ${this.hass.formatEntityAttributeValue(
        this.stateObj,
        "current_humidity",
        humidity
      )}
    `;
  }

  private _renderInfo() {
    return html`
      <div class="info">
        ${this._renderLabel()}${this._renderPrimary()}${this._renderSecondary()}
      </div>
    `;
  }

  protected render() {
    const color = stateColor(this, this.stateObj);
    const active = stateActive(this.stateObj);

    const action = this.stateObj.attributes.action;

    let actionColor: string | undefined;
    if (action && action !== "idle" && action !== "off" && active) {
      actionColor = stateColor(
        this,
        this.stateObj,
        HUMIDIFIER_ACTION_MODE[action]
      );
    }

    const targetHumidity = this._targetHumidity;
    const currentHumidity = this.stateObj.attributes.current_humidity;

    const containerSizeClass = this._sizeController.value
      ? ` ${this._sizeController.value}`
      : "";

    if (targetHumidity != null && this.stateObj.state !== UNAVAILABLE) {
      const inverted =
        this.stateObj.attributes.device_class ===
        HumidifierEntityDeviceClass.DEHUMIDIFIER;

      return html`
        <div
          class="container${containerSizeClass}"
          style=${styleMap({
            "--state-color": color,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
            .preventInteractionOnScroll=${this.preventInteractionOnScroll}
            .inactive=${!active}
            .mode=${inverted ? "end" : "start"}
            .value=${targetHumidity}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${currentHumidity}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          ${this._renderInfo()} ${this._renderButtons()}
        </div>
      `;
    }

    return html`
      <div
        class="container${containerSizeClass}"
        style=${styleMap({
          "--state-color": color,
          "--action-color": actionColor,
        })}
      >
        <ha-control-circular-slider
          .preventInteractionOnScroll=${this.preventInteractionOnScroll}
          .current=${currentHumidity}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          disabled
        >
        </ha-control-circular-slider>
        ${this._renderInfo()}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return stateControlCircularSliderStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-humidifier-humidity": HaStateControlHumidifierHumidity;
  }
}
