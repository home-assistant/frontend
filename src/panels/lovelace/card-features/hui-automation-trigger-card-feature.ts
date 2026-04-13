import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { triggerAutomationActions } from "../../../data/automation";
import { isUnavailableState } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  AutomationTriggerCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsAutomationTriggerCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return domain === "automation";
};

@customElement("hui-automation-trigger-card-feature")
class HuiAutomationTriggerCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: AutomationTriggerCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
  }

  static getStubConfig(): AutomationTriggerCardFeatureConfig {
    return {
      type: "automation-trigger",
    };
  }

  public setConfig(config: AutomationTriggerCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsAutomationTriggerCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .disabled=${isUnavailableState(this._stateObj.state)}
          class="trigger-button"
          @click=${this._triggerAutomation}
        >
          ${this._config.action_name ??
          this.hass.localize("ui.card.automation.trigger")}
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  private _triggerAutomation() {
    if (!this.hass || !this._stateObj) {
      return;
    }
    triggerAutomationActions(this.hass, this._stateObj.entity_id);
  }

  static styles = cardFeatureStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-automation-trigger-card-feature": HuiAutomationTriggerCardFeature;
  }
}
