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
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity_attributes";
import type { FanEntity, FanSpeed } from "../../../data/fan";
import {
  computeFanSpeedCount,
  computeFanSpeedIcon,
  FAN_SPEED_COUNT_MAX_FOR_BUTTONS,
  FAN_SPEEDS,
  FanEntityFeature,
  fanPercentageToSpeed,
  fanSpeedToPercentage,
} from "../../../data/fan";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  FanSpeedCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsFanSpeedCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "fan" && supportsFeature(stateObj, FanEntityFeature.SET_SPEED)
  );
};

@customElement("hui-fan-speed-card-feature")
class HuiFanSpeedCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: FanSpeedCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as FanEntity | undefined;
  }

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
      return this.hass!.formatEntityState(this._stateObj!, speed);
    }
    return this.hass!.localize(`ui.card.fan.speed.${speed}`) || speed;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsFanSpeedCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const speedCount = computeFanSpeedCount(this._stateObj);

    const percentage = stateActive(this._stateObj)
      ? (this._stateObj.attributes.percentage ?? 0)
      : 0;

    if (speedCount <= FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
      const options = FAN_SPEEDS[speedCount]!.map<ControlSelectOption>(
        (speed) => ({
          value: speed,
          label: this._localizeSpeed(speed),
          path: computeFanSpeedIcon(this._stateObj!, speed),
        })
      );

      const speed = fanPercentageToSpeed(this._stateObj, percentage);

      return html`
        <ha-control-select
          .options=${options}
          .value=${speed}
          @value-changed=${this._speedValueChanged}
          hide-option-label
          .label=${computeAttributeNameDisplay(
            this.hass.localize,
            this._stateObj,
            this.hass.entities,
            "percentage"
          )}
          .disabled=${this._stateObj!.state === UNAVAILABLE}
        >
        </ha-control-select>
      `;
    }

    const value = Math.max(Math.round(percentage), 0);

    return html`
      <ha-control-slider
        .value=${value}
        min="0"
        max="100"
        .step=${this._stateObj.attributes.percentage_step ?? 1}
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this.hass.localize,
          this._stateObj,
          this.hass.entities,
          "percentage"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.fan.percentage}
        .locale=${this.hass.locale}
      ></ha-control-slider>
    `;
  }

  private _speedValueChanged(ev: CustomEvent) {
    const speed = (ev.detail as any).value as FanSpeed;

    const percentage = fanSpeedToPercentage(this._stateObj!, speed);

    this.hass!.callService("fan", "set_percentage", {
      entity_id: this._stateObj!.entity_id,
      percentage: percentage,
    });
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;

    this.hass!.callService("fan", "set_percentage", {
      entity_id: this._stateObj!.entity_id,
      percentage: value,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-select {
          /* Color the background to match the slider style */
          --control-select-background: var(--feature-color);
          --control-select-background-opacity: 0.2;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-speed-card-feature": HuiFanSpeedCardFeature;
  }
}
