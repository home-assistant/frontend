import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  ButtonCardFeatureConfig, 
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
  return [
    "button",
    "script",
    "automation",
  ].includes(domain);
};

@customElement("hui-button-card-feature")
class HuiButtonCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: ButtonCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as HassEntity | undefined;
  }

  private _pressButton() {
    if (!this.hass || !this._stateObj) return;
  
    const domain = computeDomain(this._stateObj.entity_id);
    const service = domain === "button"
      ? "press"
      : domain === "automation"
      ? "trigger"
      : "turn_on";
  
    this.hass.callService(domain, service, {
      entity_id: this._stateObj.entity_id,
    });
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
          .disabled=${this._stateObj.state === UNAVAILABLE}
          class="press-button"
          @click=${this._pressButton}
        >
          ${this._config.action_name ??
            this.hass.localize("ui.card.button.press")}
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      cardFeatureStyles,
      css`
        ha-control-button {
          font-size: var(--ha-font-size-m);
        }
        .press-button {
          width: 130px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-card-feature": HuiButtonCardFeature;
  }
}
