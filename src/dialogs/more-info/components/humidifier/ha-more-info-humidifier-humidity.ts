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
import { clamp } from "../../../../common/number/clamp";
import { blankBeforePercent } from "../../../../common/translations/blank_before_percent";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  HumidifierEntity,
  HumidifierEntityDeviceClass,
} from "../../../../data/humidifier";
import { HomeAssistant } from "../../../../types";

@customElement("ha-more-info-humidifier-humidity")
export class HaMoreInfoHumidifierHumidity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HumidifierEntity;

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

  private _debouncedCallService = debounce(() => this._callService(), 2000);

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

  private _renderState() {
    const humidity = this.stateObj.attributes.current_humidity;
    if (humidity == null) {
      return nothing;
    }
    return html`
      <p class="current-label">
        ${this.hass.localize(
          "ui.dialogs.more_info_control.humidifier.currently"
        )}
      </p>
      <p class="current">${humidity}${blankBeforePercent(this.hass.locale)}%</p>
    `;
  }

  private _renderHumidityButtons() {
    return html`
      <div class="buttons">
        <ha-icon-button
          .path=${mdiMinus}
          .step=${-this._step}
          @click=${this._handleButton}
        ></ha-icon-button>
        <ha-icon-button
          .path=${mdiPlus}
          .step=${this._step}
          @click=${this._handleButton}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderHumidity(humidity: number) {
    const humidityRounded = Math.round(humidity);

    return html`
      <p class="humidity">
        <span aria-hidden="true">
          ${humidityRounded}
          <span class="unit">%</span>
        </span>
        <span class="visually-hidden">
          ${humidity}${blankBeforePercent(this.hass.locale)}%
        </span>
      </p>
    `;
  }

  protected render() {
    const mainColor = stateColorCss(this.stateObj);

    if (this._targetHumidity != null) {
      return html`
        <div
          class="container"
          style=${styleMap({
            "--main-color": mainColor,
          })}
        >
          <ha-control-circular-slider
            .inverted=${this.stateObj.attributes.device_class ===
            HumidifierEntityDeviceClass.DEHUMIDIFIER}
            .value=${this._targetHumidity}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${this.stateObj.attributes.current_humidity}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            ${this._renderHumidity(this._targetHumidity)} ${this._renderState()}
          </div>
          ${this._renderHumidityButtons()}
        </div>
      `;
    }

    return html`
      <div
        class="container"
        style=${styleMap({
          "--background-color": mainColor,
        })}
      >
        <ha-control-circular-slider
          .current=${this.stateObj.attributes.current_humidity}
          .min=${this._min}
          .max=${this._max}
          .step=${this._step}
          disabled
        >
        </ha-control-circular-slider>
        <div class="info">${this._renderState()}</div>
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
      .humidity {
        display: inline-flex;
        font-size: 58px;
        line-height: 64px;
        letter-spacing: -0.25px;
        margin: 20px 0;
      }
      .humidity span {
        display: inline-flex;
      }
      .humidity .unit {
        font-size: 24px;
        line-height: 40px;
      }
      .current-label {
        font-weight: 500;
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 4px;
      }
      .current {
        display: flex;
        flex-direction: row;
        gap: 12px;
      }
      .current p {
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
      .state ha-svg-icon {
        --mdc-icon-size: 20px;
        margin-right: 8px;
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
    "ha-more-info-humidifier-humidity": HaMoreInfoHumidifierHumidity;
  }
}
