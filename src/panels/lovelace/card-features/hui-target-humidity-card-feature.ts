import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-control-slider";
import {
  apiContext,
  formattersContext,
  internationalizationContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { HumidifierEntity } from "../../../data/humidifier";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  TargetHumidityCardFeatureConfig,
} from "./types";

const supportsTargetHumidityCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "humidifier";
};

export const supportsTargetHumidityCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsTargetHumidityCardFeatureFromState(stateObj);
};

@customElement("hui-target-humidity-card-feature")
class HuiTargetHumidityCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HumidifierEntity;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters!: HomeAssistantFormatters;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

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
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._targetHumidity = this._stateObj.attributes.humidity;
    }
  }

  private _step = 1;

  private get _min() {
    return this._stateObj!.attributes.min_humidity ?? 0;
  }

  private get _max() {
    return this._stateObj!.attributes.max_humidity ?? 100;
  }

  private _valueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    const { value } = ev.detail;
    if (typeof value !== "number" || isNaN(value)) return;
    this._targetHumidity = value;
    this._callService();
  }

  private _callService() {
    this._api.callService("humidifier", "set_humidity", {
      entity_id: this._stateObj!.entity_id,
      humidity: this._targetHumidity,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsTargetHumidityCardFeatureFromState(this._stateObj)
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
        .label=${this._formatters.formatEntityAttributeName(
          this._stateObj,
          "humidity"
        )}
        unit="%"
        .locale=${this._locale}
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
