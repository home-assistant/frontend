import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { computeCssColor } from "../../../common/color/compute-color";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { computeAttributeNameDisplay } from "../../../common/entity/compute_attribute_display";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColorCss } from "../../../common/entity/state_color";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-slider";
import { coverSupportsPosition, type CoverEntity } from "../../../data/cover";
import {
  apiContext,
  entitiesContext,
  internationalizationContext,
} from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import { DOMAIN_ATTRIBUTES_UNITS } from "../../../data/entity/entity_attributes";
import type { FrontendLocaleData } from "../../../data/translation";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantInternationalization,
} from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  CoverPositionCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsCoverPositionCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return domain === "cover" && coverSupportsPosition(stateObj);
};

export const supportsCoverPositionCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsCoverPositionCardFeatureFromState(stateObj);
};

@customElement("hui-cover-position-card-feature")
class HuiCoverPositionCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @property({ attribute: false }) public color?: string;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: CoverEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  @state() private _config?: CoverPositionCardFeatureConfig;

  static getStubConfig(): CoverPositionCardFeatureConfig {
    return {
      type: "cover-position",
    };
  }

  public setConfig(config: CoverPositionCardFeatureConfig): void {
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
      !supportsCoverPositionCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    const percentage = stateActive(this._stateObj)
      ? (this._stateObj.attributes.current_position ?? 0)
      : 0;

    const value = Math.max(Math.round(percentage), 0);

    const openColor = stateColorCss(this._stateObj, "open");

    const color = this.color
      ? computeCssColor(this.color)
      : stateColorCss(this._stateObj);

    const style = {
      "--feature-color": color,
      // Use open color for inactive state to avoid grey slider that looks disabled
      "--state-cover-inactive-color": openColor,
    };

    return html`
      <ha-control-slider
        style=${styleMap(style)}
        .value=${value}
        min="0"
        max="100"
        step="1"
        inverted
        show-handle
        @value-changed=${this._valueChanged}
        .label=${computeAttributeNameDisplay(
          this._localize,
          this._stateObj,
          this._entities,
          "current_position"
        )}
        .disabled=${this._stateObj!.state === UNAVAILABLE}
        .unit=${DOMAIN_ATTRIBUTES_UNITS.cover.current_position}
        .locale=${this._locale}
      ></ha-control-slider>
    `;
  }

  private _valueChanged(ev: HASSDomEvent<HASSDomEvents["value-changed"]>) {
    const { value } = ev.detail;
    if (typeof value !== "number" || isNaN(value)) return;

    this._api.callService("cover", "set_cover_position", {
      entity_id: this._stateObj!.entity_id,
      position: value,
    });
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-card-feature": HuiCoverPositionCardFeature;
  }
}
