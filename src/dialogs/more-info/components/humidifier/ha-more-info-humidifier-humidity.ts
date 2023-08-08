import { mdiMinus, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, PropertyValues, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeValueDisplay } from "../../../../common/entity/compute_attribute_display";
import { stateActive } from "../../../../common/entity/state_active";
import { stateColorCss } from "../../../../common/entity/state_color";
import { clamp } from "../../../../common/number/clamp";
import { formatNumber } from "../../../../common/number/format_number";
import { blankBeforePercent } from "../../../../common/translations/blank_before_percent";
import { debounce } from "../../../../common/util/debounce";
import "../../../../components/ha-control-circular-slider";
import "../../../../components/ha-outlined-icon-button";
import "../../../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../../../data/entity";
import {
  HUMIDIFIER_ACTION_MODE,
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

  private _renderAction() {
    const action = this.stateObj.attributes.action;

    const actionLabel = computeAttributeValueDisplay(
      this.hass.localize,
      this.stateObj,
      this.hass.locale,
      this.hass.config,
      this.hass.entities,
      "action"
    ) as string;

    return html`
      <p class="action">
        ${action && ["drying", "humidifying"].includes(action)
          ? this.hass.localize(
              "ui.dialogs.more_info_control.humidifier.target_label",
              { action: actionLabel }
            )
          : action && action !== "off" && action !== "idle"
          ? actionLabel
          : this.hass.localize(
              "ui.dialogs.more_info_control.humidifier.target"
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
    const formatted = formatNumber(humidity, this.hass.locale, {
      maximumFractionDigits: 0,
    });

    return html`
      <div class="target">
        <p class="value" aria-hidden="true">
          ${formatted}<span class="unit">%</span>
        </p>
        <p class="visually-hidden">
          ${formatted}${blankBeforePercent(this.hass.locale)}%
        </p>
      </div>
    `;
  }

  protected render() {
    const mainColor = stateColorCss(this.stateObj);
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

    if (targetHumidity != null) {
      const inverted =
        this.stateObj.attributes.device_class ===
        HumidifierEntityDeviceClass.DEHUMIDIFIER;

      return html`
        <div
          class="container"
          style=${styleMap({
            "--main-color": mainColor,
            "--action-color": actionColor,
          })}
        >
          <ha-control-circular-slider
            .inverted=${inverted}
            .value=${targetHumidity}
            .min=${this._min}
            .max=${this._max}
            .step=${this._step}
            .current=${currentHumidity}
            .disabled=${this.stateObj.state === UNAVAILABLE}
            @value-changed=${this._valueChanged}
            @value-changing=${this._valueChanging}
          >
          </ha-control-circular-slider>
          <div class="info">
            <div class="action-container">${this._renderAction()}</div>
            <div class="target-container">
              ${this._renderTarget(targetHumidity)}
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
      .target-container {
        margin-bottom: 30px;
      }
      .target .value {
        font-size: 56px;
        line-height: 1;
        letter-spacing: -0.25px;
      }
      .target .value .unit {
        font-size: 0.4em;
        line-height: 1;
        margin-left: 2px;
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
    "ha-more-info-humidifier-humidity": HaMoreInfoHumidifierHumidity;
  }
}
