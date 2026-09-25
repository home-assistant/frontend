import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-slider";
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { lightSupportsBrightness, type LightEntity } from "../../../data/light";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightBrightnessCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsLightBrightnessCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "light" && lightSupportsBrightness(stateObj);
};

export const supportsLightBrightnessCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightBrightnessCardFeatureFromState(stateObj);
};

@customElement("hui-light-brightness-card-feature")
class HuiLightBrightnessCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: LightEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: LightBrightnessCardFeatureConfig;

  static getStubConfig(): LightBrightnessCardFeatureConfig {
    return {
      type: "light-brightness",
    };
  }

  public setConfig(config: LightBrightnessCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsLightBrightnessCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.brightness != null
        ? Math.max(
            Math.round((this._stateObj.attributes.brightness * 100) / 255),
            1
          )
        : undefined;

    return html`
      <ha-control-slider
        .value=${position}
        min="1"
        max="100"
        .showHandle=${stateActive(this._stateObj)}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this._localize("ui.card.light.brightness")}
        unit="%"
        .locale=${this._locale}
      ></ha-control-slider>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this._api.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      brightness_pct: value,
    });
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-brightness-card-feature": HuiLightBrightnessCardFeature;
  }
}
