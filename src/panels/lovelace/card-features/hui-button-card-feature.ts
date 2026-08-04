import { consume } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { apiContext, servicesContext } from "../../../data/context";
import { forwardHaptic } from "../../../data/haptics";
import {
  hasRequiredScriptFieldsForServices,
  requiredScriptFieldsFilledForServices,
} from "../../../data/script";
import { showMoreInfoDialog } from "../../../dialogs/more-info/show-ha-more-info-dialog";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  ButtonCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

const supportsButtonCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return ["button", "input_button", "scene", "script"].includes(domain);
};

export const supportsButtonCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsButtonCardFeatureFromState(stateObj);
};

@customElement("hui-button-card-feature")
class HuiButtonCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state()
  @consume({ context: servicesContext, subscribe: true })
  private _services!: HomeAssistant["services"];

  @state() private _config?: ButtonCardFeatureConfig;

  private _pressButton() {
    if (!this._stateObj) return;

    const domain = computeDomain(this._stateObj.entity_id);
    const service =
      domain === "button" || domain === "input_button" ? "press" : "turn_on";

    if (domain === "script") {
      const entityId = this._stateObj.entity_id;
      if (
        hasRequiredScriptFieldsForServices(this._services, entityId) &&
        !requiredScriptFieldsFilledForServices(
          this._services,
          entityId,
          this._config?.data
        )
      ) {
        showMoreInfoDialog(this, {
          entityId: entityId,
          data: this._config?.data,
        });
        return;
      }
    }

    const serviceData = {
      entity_id: this._stateObj.entity_id,
      ...(this._config?.data
        ? {
            variables: this._config.data,
          }
        : {}),
    };

    forwardHaptic(this, "light");

    this._api.callService(domain, service, serviceData);
  }

  static getStubConfig(): ButtonCardFeatureConfig {
    return {
      type: "button",
    };
  }

  public setConfig(config: ButtonCardFeatureConfig): void {
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
      !supportsButtonCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .disabled=${this._stateObj.state === "unavailable"}
          class="press-button"
          @click=${this._pressButton}
        >
          ${this._config.action_name ?? this._localize("ui.card.button.press")}
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static styles = cardFeatureStyles;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-button-card-feature-editor");
    return document.createElement("hui-button-card-feature-editor");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-feature": HuiButtonCardFeature;
  }
}
