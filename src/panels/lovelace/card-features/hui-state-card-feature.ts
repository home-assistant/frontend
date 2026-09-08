import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../../common/decorators/consume-context-entry";
import "../../../state-display/state-display";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import type {
  LovelaceCardFeatureContext,
  StateCardFeatureConfig,
} from "./types";

export const supportsStateCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => !!context.entity_id && context.entity_id in hass.states;

@customElement("hui-state-card-feature")
class HuiStateCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: HassEntity;

  @state() private _config?: StateCardFeatureConfig;

  static getStubConfig(): StateCardFeatureConfig {
    return {
      type: "state",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-state-card-feature-editor");
    return document.createElement("hui-state-card-feature-editor");
  }

  public setConfig(config: StateCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected render() {
    if (!this._config || !this.hass || !this._stateObj) {
      return nothing;
    }

    return html`
      <state-display
        .hass=${this.hass}
        .stateObj=${this._stateObj}
        .content=${this._config.state_content}
      ></state-display>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--feature-height);
      padding: 0 var(--ha-space-2);
      box-sizing: border-box;
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
      text-align: center;
      overflow: hidden;
      pointer-events: none !important;
    }
    state-display {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-card-feature": HuiStateCardFeature;
  }
}
