import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeAttributeNameDisplay } from "../../common/entity/compute_attribute_display";
import { stateActive } from "../../common/entity/state_active";
import { stateColorCss } from "../../common/entity/state_color";
import "../../components/ha-control-select";
import type { ControlSelectOption } from "../../components/ha-control-select";
import "../../components/ha-control-slider";
import { UNAVAILABLE } from "../../data/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../data/entity_attributes";
import type { FanEntity, FanSpeed } from "../../data/fan";
import {
  computeFanSpeedCount,
  computeFanSpeedIcon,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FAN_SPEEDS,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
} from "../../data/fan";
import type { HomeAssistant } from "../../types";

@customElement("ha-state-control-fan-speed")
export class HaStateControlFanSpeed extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: FanEntity;

  @state() sliderValue?: number;

  @state() speedValue?: FanSpeed;

  protected updated(changedProp: Map<string | number | symbol, unknown>): void {
    if (changedProp.has("stateObj")) {
      const percentage = stateActive(this.stateObj)
        ? (this.stateObj.attributes.percentage ?? 0)
        : 0;
      this.sliderValue = Math.max(Math.round(percentage), 0);
      this.speedValue = fanPercentageToSpeed(this.stateObj, percentage);
    }
  }

  private _speedValueChanged(ev: CustomEvent) {
    const speed = (ev.detail as any).value as FanSpeed;

    this.speedValue = speed;

    const percentage = fanSpeedToPercentage(this.stateObj, speed);

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: percentage,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.sliderValue = value;

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: value,
    });
  }

  private _localizeSpeed(speed: FanSpeed) {
    if (speed === "on" || speed === "off") {
      return this.hass.formatEntityState(this.stateObj, speed);
    }
    return this.hass.localize(`ui.card.fan.speed.${speed}`) || speed;
  }

  protected render() {
    const color = stateColorCss(this.stateObj);

    const speedCount = computeFanSpeedCount(this.stateObj);

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = FAN_SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path: computeFanSpeedIcon(this.stateObj, speed),
        })
      ).reverse();

      return html`
        <ha-control-select
          vertical
          .options=${options}
          .value=${this.speedValue}
          @value-changed=${this._speedValueChanged}
          .label=${computeAttributeNameDisplay(
            this.hass.localize,
            this.stateObj,
            this.hass.entities,
            "percentage"
          )}
          style=${styleMap({
            "--control-select-color": color,
            "--control-select-background": color,
          })}
          .disabled=${this.stateObj.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    return html`
      <ha-control-slider
        touch-action="none"
        vertical
        min="0"
        max="100"
        .value=${this.sliderValue}
        .step=${this.stateObj.attributes.percentage_step ?? 1}
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this.hass.localize,
          this.stateObj,
          this.hass.entities,
          "percentage"
        )}
        style=${styleMap({
          "--control-slider-color": color,
          "--control-slider-background": color,
        })}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.fan.percentage}
        .locale=${this.hass.locale}
      >
      </ha-control-slider>
    `;
  }

  static styles = css`
    ha-control-slider {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-slider-thickness: 130px;
      --control-slider-border-radius: 36px;
      --control-slider-color: var(--primary-color);
      --control-slider-background: var(--disabled-color);
      --control-slider-background-opacity: 0.2;
      --control-slider-tooltip-font-size: var(--ha-font-size-xl);
    }
    ha-control-select {
      height: 45vh;
      max-height: 320px;
      min-height: 200px;
      --control-select-thickness: 130px;
      --control-select-border-radius: 36px;
      --control-select-color: var(--primary-color);
      --control-select-background: var(--disabled-color);
      --control-select-background-opacity: 0.2;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-state-control-fan-speed": HaStateControlFanSpeed;
  }
}
