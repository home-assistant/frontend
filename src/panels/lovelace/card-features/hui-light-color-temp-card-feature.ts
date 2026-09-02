import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import {
  DEFAULT_MAX_KELVIN,
  DEFAULT_MIN_KELVIN,
} from "../../../common/color/convert-light-color";
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
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity/entity_attributes";
import {
  LightColorMode,
  lightSupportsColorMode,
  type LightEntity,
} from "../../../data/light";
import type { FrontendLocaleData } from "../../../data/translation";
import { generateColorTemperatureGradient } from "../../../dialogs/more-info/components/lights/light-color-temp-picker";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LightColorTempCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsLightColorTempCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "light" &&
    lightSupportsColorMode(stateObj, LightColorMode.COLOR_TEMP)
  );
};

export const supportsLightColorTempCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsLightColorTempCardFeatureFromState(stateObj);
};

@customElement("hui-light-color-temp-card-feature")
class HuiLightColorTempCardFeature
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

  @state() private _config?: LightColorTempCardFeatureConfig;

  static getStubConfig(): LightColorTempCardFeatureConfig {
    return {
      type: "light-color-temp",
    };
  }

  public setConfig(config: LightColorTempCardFeatureConfig): void {
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
      !supportsLightColorTempCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const position =
      this._stateObj.attributes.color_temp_kelvin != null
        ? this._stateObj.attributes.color_temp_kelvin
        : undefined;

    const minKelvin =
      this._stateObj.attributes.min_color_temp_kelvin ?? DEFAULT_MIN_KELVIN;
    const maxKelvin =
      this._stateObj.attributes.max_color_temp_kelvin ?? DEFAULT_MAX_KELVIN;

    const gradient = this._generateTemperatureGradient(minKelvin!, maxKelvin);

    return html`
      <ha-control-slider
        .value=${position}
        mode="cursor"
        .showHandle=${stateActive(this._stateObj)}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        @value-changed=${this._valueChanged}
        .label=${this._localize("ui.card.light.color_temperature")}
        .min=${minKelvin}
        .max=${maxKelvin}
        style=${styleMap({
          "--gradient": gradient,
        })}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.light.color_temp_kelvin}
        .locale=${this._locale}
      ></ha-control-slider>
    `;
  }

  private _generateTemperatureGradient = memoizeOne(
    (min: number, max: number) => generateColorTemperatureGradient(min, max)
  );

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;

    this._api.callService("light", "turn_on", {
      entity_id: this._stateObj!.entity_id,
      color_temp_kelvin: value,
    });
  }

  static get styles() {
    return [
      cardFeatureStyles,
      css`
        ha-control-slider {
          --control-slider-background: linear-gradient(
            to right,
            var(--gradient)
          );
          --control-slider-background-opacity: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-temp-card-feature": HuiLightColorTempCardFeature;
  }
}
