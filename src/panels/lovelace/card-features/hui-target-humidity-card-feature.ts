import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-slider";
import { UNAVAILABLE } from "../../../data/entity";
import { HumidifierEntity } from "../../../data/humidifier";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import { TargetHumidityCardFeatureConfig } from "./types";

export const supportsTargetHumidityCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

@customElement("hui-target-humidity-card-feature")
class HuiTargetHumidityCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HumidifierEntity;

  @state() private _config?: TargetHumidityCardFeatureConfig;

  @state() private _targetHumidity?: number;

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
    if (changedProp.has("stateObj")) {
      this._targetHumidity = this.stateObj!.attributes.humidity;
    }
  }

  private get _step() {
    return 1;
  }

  private get _min() {
    return this.stateObj!.attributes.min_humidity ?? 0;
  }

  private get _max() {
    return this.stateObj!.attributes.max_humidity ?? 100;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.detail as any).value;
    if (isNaN(value)) return;
    this._targetHumidity = value;
    this._callService();
  }

  private _callService() {
    this.hass!.callService("humidifier", "set_humidity", {
      entity_id: this.stateObj!.entity_id,
      humidity: this._targetHumidity,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsTargetHumidityCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-slider
        .value=${this.stateObj.attributes.humidity}
        .min=${this._min}
        .max=${this._max}
        .step=${this._step}
        .disabled=${this.stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this.hass.formatEntityAttributeName(this.stateObj, "humidity")}
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
