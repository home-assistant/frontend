import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import "../../../components/ha-control-number-buttons";
import "../../../components/ha-control-slider";
import "../../../components/ha-icon";
import { apiContext, internationalizationContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  NumericInputCardFeatureConfig,
} from "./types";

const supportsNumericInputCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "input_number" || domain === "number";
};

export const supportsNumericInputCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsNumericInputCardFeatureFromState(stateObj);
};

@customElement("hui-numeric-input-card-feature")
class HuiNumericInputCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: NumericInputCardFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): NumericInputCardFeatureConfig {
    return {
      type: "numeric-input",
      style: "buttons",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-numeric-input-card-feature-editor");
    return document.createElement("hui-numeric-input-card-feature-editor");
  }

  public setConfig(config: NumericInputCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("_stateObj") && this._stateObj) {
      this._currentState = this._stateObj.state;
    }
  }

  private async _setValue(ev: CustomEvent) {
    const stateObj = this._stateObj!;

    const domain = computeDomain(stateObj.entity_id);

    await this._api.callService(domain, "set_value", {
      entity_id: stateObj.entity_id,
      value: ev.detail.value,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsNumericInputCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const stateObj = this._stateObj;

    const parsedState = Number(stateObj.state);
    const value = !isNaN(parsedState) ? parsedState : undefined;

    if (this._config.style === "buttons") {
      return html`
        <ha-control-number-buttons
          .value=${value}
          .min=${stateObj.attributes.min}
          .max=${stateObj.attributes.max}
          .step=${stateObj.attributes.step}
          @value-changed=${this._setValue}
          .disabled=${stateObj.state === UNAVAILABLE}
          .unit=${stateObj.attributes.unit_of_measurement}
          .locale=${this._locale}
        ></ha-control-number-buttons>
      `;
    }
    return html`
      <ha-control-slider
        .value=${value}
        .min=${stateObj.attributes.min}
        .max=${stateObj.attributes.max}
        .step=${stateObj.attributes.step}
        @value-changed=${this._setValue}
        .disabled=${stateObj.state === UNAVAILABLE}
        .unit=${stateObj.attributes.unit_of_measurement}
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
    "hui-numeric-input-card-feature": HuiNumericInputCardFeature;
  }
}
