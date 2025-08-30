import type { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type {
  ButtonCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "./types";

export const supportsButtonCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return ["button", "input_button", "scene", "script"].includes(domain);
};

@customElement("hui-button-card-feature")
class HuiButtonCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ButtonCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    if (!this.hass || !this._stateObj) return;

    if (this._config?.button_action) {
      handleAction(
        this,
        this.hass,
        this._config.button_action,
        ev.detail.action!
      );
      return;
    }

    const domain = computeDomain(this._stateObj.entity_id);
    const service =
      domain === "button" || domain === "input_button" ? "press" : "turn_on";

    this.hass.callService(domain, service, {
      entity_id: this._stateObj.entity_id,
    });
  }

  static getStubConfig(): ButtonCardFeatureConfig {
    return { type: "button" };
  }

  public setConfig(config: ButtonCardFeatureConfig): void {
    if (!config) throw new Error("Invalid configuration");

    this._config = { button_action: { action: "more-info" }, ...config };
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsButtonCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .disabled=${this._stateObj.state === "unavailable"}
          class="press-button"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config.button_action),
            hasDoubleClick: hasAction(this._config.button_action),
          })}
        >
          ${this._config.action_name ??
          this.hass.localize("ui.card.button.press")}
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
