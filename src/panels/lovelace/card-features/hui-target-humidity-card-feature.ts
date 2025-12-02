import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import type { HumidifierEntity } from "../../../data/humidifier";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TargetHumidityCardFeatureConfig,
} from "./types";

export const supportsTargetHumidityCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

@customElement("hui-target-humidity-card-feature")
class HuiTargetHumidityCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TargetHumidityCardFeatureConfig;

  @state() private _targetHumidity?: number;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | HumidifierEntity
      | undefined;
  }

  static getStubConfig(): TargetHumidityCardFeatureConfig {
    return {
      type: "target-humidity",
    };
  }

  public setConfig(config: TargetHumidityCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (
      (changedProp.has("hass") || changedProp.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProp.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._targetHumidity = this._stateObj!.attributes.humidity;
      }
    }
  }

  private _step = 1;

  private get _min() {
    return this._stateObj!.attributes.min_humidity ?? 0;
  }

  private get _max() {
    return this._stateObj!.attributes.max_humidity ?? 100;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._targetHumidity = value;
    this._callService();
  }

  private _callService() {
    this.hass!.callService("humidifier", "set_humidity", {
      entity_id: this._stateObj!.entity_id,
      humidity: this._targetHumidity,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsTargetHumidityCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-slider
        .value=${this._stateObj.attributes.humidity}
        .min=${this._min}
        .max=${this._max}
        .step=${this._step}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this.hass.formatEntityAttributeName(
          this._stateObj,
          "humidity"
        )}
        unit="%"
        .locale=${this.hass.locale}
      ></ha-control-slider>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-target-humidity-card-feature": HuiTargetHumidityCardFeature;
  }
}
