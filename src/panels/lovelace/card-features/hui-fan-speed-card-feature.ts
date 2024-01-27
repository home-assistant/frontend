import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import {
  computeFanSpeedCount,
  computeFanSpeedIcon,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FAN_SPEEDS,
  FanEntity,
  FanEntityFeature,
  fanPercentageToSpeed,
  FanSpeed,
  fanSpeedToPercentage,
} from "../../../data/fan";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { FanSpeedCardFeatureConfig } from "./types";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity_attributes";

export const supportsFanSpeedCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.SET_SPEED)
  );
};

@customElement("hui-fan-speed-card-feature")
class HuiFanSpeedCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: FanEntity;

  @state() private _config?: FanSpeedCardFeatureConfig;

  static getStubConfig(): FanSpeedCardFeatureConfig {
    return {
      type: "fan-speed",
    };
  }

  public setConfig(config: FanSpeedCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private _localizeSpeed(speed: FanSpeed) {
    if (speed === "on" || speed === "off") {
      return this.hass!.formatEntityState(this.stateObj!, speed);
    }
    return this.hass!.localize(`ui.card.fan.speed.${speed}`) || speed;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsFanSpeedCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    const speedCount = computeFanSpeedCount(this.stateObj);

    const percentage = stateActive(this.stateObj)
      ? this.stateObj.attributes.percentage ?? 0
      : 0;

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = FAN_SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path: computeFanSpeedIcon(this.stateObj!, speed),
        })
      );

      const speed = fanPercentageToSpeed(this.stateObj, percentage);

      return html`
        <div class="container">
          <ha-control-select
            .options=${options}
            .value=${speed}
            @value-changed=${this._speedValueChanged}
            hide-label
            .ariaLabel=${computeAttributeNameDisplay(
              this.hass.localize,
              this.stateObj,
              this.hass.entities,
              "percentage"
            )}
            .disabled=${this.stateObj!.state === UNAVAILABLE}
          >
          </ha-control-select>
        </div>
      `;
    }

    const value = Math.max(Math.round(percentage), 0);

    return html`
      <div class="container">
        <ha-control-slider
          .value=${value}
          min="0"
          max="100"
          .step=${this.stateObj.attributes.percentage_step ?? 1}
          @value-changed=${this._valueChanged}
          .ariaLabel=${computeAttributeNameDisplay(
            this.hass.localize,
            this.stateObj,
            this.hass.entities,
            "percentage"
          )}
          .disabled=${this.stateObj!.state === UNAVAILABLE}
          .unit=${DOMAIN_ATTRIBUTES_UNITS.fan.percentage}
          .locale=${this.hass.locale}
        ></ha-control-slider>
      </div>
    `;
  }

  private _speedValueChanged(ev: CustomEvent) {
    const speed = (ev.detail as any).value as FanSpeed;

    const percentage = fanSpeedToPercentage(this.stateObj!, speed);

    this.hass!.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: percentage,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass!.callService("fan", "set_percentage", {
      entity_id: this.stateObj!.entity_id,
      percentage: value,
    });
  }

  static get styles() {
    return css`
      ha-control-slider {
        --control-slider-color: var(--feature-color);
        --control-slider-background: var(--feature-color);
        --control-slider-background-opacity: 0.2;
        --control-slider-thickness: 40px;
        --control-slider-border-radius: 10px;
      }
      ha-control-select {
        --control-select-color: var(--feature-color);
        --control-select-background: var(--feature-color);
        --control-select-background-opacity: 0.2;
        --control-select-padding: 0;
        --control-select-thickness: 40px;
        --control-select-border-radius: 10px;
        --control-select-button-border-radius: 10px;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-speed-card-feature": HuiFanSpeedCardFeature;
  }
}
