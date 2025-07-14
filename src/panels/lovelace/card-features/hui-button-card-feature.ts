import { mdiCheck } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { UNAVAILABLE, UNKNOWN } from "../../../data/entity";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LockOpenDoorCardFeatureConfig,
  ButtonCardFeatureConfig, ##########to still create
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

@customElement("hui-lock-open-door-card-feature")
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

  static getStubConfig(): ButtonCardFeatureConfig {
    return {
      type: "button",
    };
  }

  public setConfig(config: LockOpenDoorCardFeatureConfig): void {
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
          .disabled=${(this._stateObj) === UNAVAILABLE}
          class="press-button"
          @click=${this._pressButton}
        >
          ${this.hass.localize("ui.card.button.press")}
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
