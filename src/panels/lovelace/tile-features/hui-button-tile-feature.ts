import { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { isUnavailableState } from "../../../data/entity";
import { ScriptEntity } from "../../../data/script";
import { AutomationEntity } from "../../../data/automation";
import { HomeAssistant } from "../../../types";
import { LovelaceTileFeature } from "../types";
import { ButtonTileFeatureConfig } from "./types";
import "../../../components/ha-control-button";

const DOMAINS = ["automation", "button", "input_button", "script"] as const;
type DOMAIN = (typeof DOMAINS)[number];

export const supportsButtonTileFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return DOMAINS.includes(domain as DOMAIN);
};

@customElement("hui-button-tile-feature")
class HuiButtonTileFeature extends LitElement implements LovelaceTileFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?:
    | ScriptEntity
    | AutomationEntity
    | HassEntity;

  @state() private _config?: ButtonTileFeatureConfig;

  @state() _currentState?: string;

  static getStubConfig(): ButtonTileFeatureConfig {
    return {
      type: "button",
    };
  }

  public setConfig(config: ButtonTileFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj") && this.stateObj) {
      this._currentState = this.stateObj.state;
    }
  }

  private async _press() {
    const stateObj = this.stateObj!;

    const domain = computeDomain(stateObj.entity_id) as DOMAIN;

    switch (domain) {
      case "automation":
        await this.hass!.callService("automation", "trigger", {
          entity_id: stateObj.entity_id,
        });
        break;
      case "script":
        await this.hass!.callService("script", "turn_on", {
          entity_id: stateObj.entity_id,
        });
        break;
      case "button":
      case "input_button":
        await this.hass!.callService(domain, "press", {
          entity_id: stateObj.entity_id,
        });
        break;
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsButtonTileFeature(this.stateObj)
    ) {
      return nothing;
    }

    const stateObj = this.stateObj;

    const domain = computeDomain(stateObj.entity_id) as DOMAIN;

    return html`
      <div class="container">
        <ha-control-button
          .disabled=${isUnavailableState(stateObj.state)}
          @click=${this._press}
        >
          ${this.hass.localize(
            domain === "automation"
              ? "ui.card.automation.trigger"
              : domain === "script"
              ? "ui.card.script.run"
              : domain === "button"
              ? "ui.card.button.press"
              : domain === "input_button"
              ? "ui.card.button.press"
              : "ui.card.button.press"
          )}
        </ha-control-button>
      </div>
    `;
  }

  static get styles() {
    return css`
      ha-control-button {
        --control-button-background-color: var(--tile-color);
        width: 100%;
      }
      .container {
        padding: 0 12px 12px 12px;
        width: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-button-tile-feature": HuiButtonTileFeature;
  }
}
