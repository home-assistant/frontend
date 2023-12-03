import { mdiMinus, mdiPlus, mdiWaterPercent } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { stateActive } from "../../common/entity/state_active";
import { stateColorCss } from "../../common/entity/state_color";
import { clamp } from "../../common/number/clamp";
import { debounce } from "../../common/util/debounce";
import "../../components/ha-big-number";
import "../../components/ha-control-circular-slider";
import "../../components/ha-outlined-icon-button";
import "../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../data/entity";
import {
  HUMIDIFIER_ACTION_MODE,
  HumidifierEntity,
  HumidifierEntityDeviceClass,
} from "../../data/humidifier";
import { HomeAssistant } from "../../types";
import { stateControlCircularSliderStyle } from "../state-control-circular-slider-style";

@customElement("ha-state-control-humidifier-humidity")
export class HaStateControlHumidifierHumidity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HumidifierEntity;

  @property({ attribute: "show-current", type: Boolean })
  public showCurrent?: boolean = false;

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

    const actionLabel = this.hass.formatEntityAttributeValue(
      this.stateObj,
      "action"
    );

    return html`
      <p class="label">
        ${action && action !== "off" && action !== "idle"
          ? actionLabel
          : this.hass.localize("ui.card.humidifier.target")}
      </p>
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

  protected render() {
    const stateColor = stateColorCss(this.stateObj);
    const active = stateActive(this.stateObj);

    const action = this.stateObj.attributes.action;

    let actionColor: string | undefined;
    if (action && action !== "idle" && action !== "off" && active) {
      actionColor = stateColorCss(
        this.stateObj,
        HUMIDIFIER_ACTION_MODE[action]
      );
    }

    const targetHumidity = this._targetHumidity;
    const currentHumidity = this.stateObj.attributes.current_humidity;

    if (targetHumidity != null && this.stateObj.state !== UNAVAILABLE) {
      const inverted =
        this.stateObj.attributes.device_class ===
        HumidifierEntityDeviceClass.DEHUMIDIFIER;

      return html`
        <div
          class="container"
          style=${styleMap({
            "--state-color": stateColor,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
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
      <div
        class="container"
        style=${styleMap({
          "--action-color": actionColor,
        })}
      >
        <ha-control-circular-slider
          .current=${currentHumidity}
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
    "ha-state-control-humidifier-humidity": HaStateControlHumidifierHumidity;
  }
}
