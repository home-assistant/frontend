import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../components/ha-text-contain";
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
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  return Boolean(stateObj);
};

@customElement("hui-state-card-feature")
class HuiStateCardFeature extends LitElement implements LovelaceCardFeature {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: StateCardFeatureConfig;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id] as HassEntity | undefined;
  }

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
    if (!this._config || !this.hass || !this.context || !this._stateObj) {
      return nothing;
    }

    const content = Array.isArray(this._config.state_content)
      ? this._config.state_content[0]
      : this._config.state_content;

    return html`
      <ha-text-contain
        min-size="12"
        .maxSize=${this._config.target_font_size ?? 20}
      >
        <state-display
          .hass=${this.hass}
          .stateObj=${this._stateObj}
          .content=${content}
        ></state-display>
      </ha-text-contain>
    `;
  }

  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      min-height: var(--feature-height);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 var(--ha-space-2);
      box-sizing: border-box;
      color: var(--primary-text-color);
      text-align: center;
      pointer-events: none !important;
      user-select: none;
    }
    ha-text-contain {
      width: 100%;
      height: 100%;
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-condensed);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-card-feature": HuiStateCardFeature;
  }
}
