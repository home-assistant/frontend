import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/ha-card";
import "../../../components/ha-button";
import "../../../components/ha-icon";
import type { HomeAssistant } from "../../../types";
import { handleAction } from "../common/handle-action";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type { EmptyStateCardConfig } from "./types";

@customElement("hui-empty-state-card")
export class HuiEmptyStateCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-empty-state-card-editor");
    return document.createElement("hui-empty-state-card-editor");
  }

  public static getStubConfig(): EmptyStateCardConfig {
    return {
      type: "empty-state",
      title: "Welcome Home",
      content: "This is an empty state card.",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EmptyStateCardConfig;

  public getCardSize(): number {
    return 2;
  }

  public setConfig(config: EmptyStateCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-card
        class=${classMap({
          "content-only": this._config.content_only ?? false,
        })}
      >
        <div class="container">
          ${this._config.icon
            ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
            : nothing}
          ${this._config.title ? html`<h1>${this._config.title}</h1>` : nothing}
          ${this._config.content
            ? html`<p>${this._config.content}</p>`
            : nothing}
          ${this._config.tap_action && this._config.action_label
            ? html`
                <ha-button @click=${this._handleAction}>
                  ${this._config.action_label}
                </ha-button>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _handleAction(): void {
    if (this._config?.tap_action && this.hass) {
      handleAction(this, this.hass, this._config, "tap");
    }
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    ha-card {
      height: 100%;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      height: 100%;
      padding: var(--ha-space-8) var(--ha-space-4);
      box-sizing: border-box;
      gap: var(--ha-space-4);
      max-width: 640px;
      margin: 0 auto;
    }
    ha-icon {
      --mdc-icon-size: var(--ha-space-12);
      color: var(--secondary-text-color);
    }
    h1 {
      margin: 0;
      font-size: var(--ha-font-size-xl);
      font-weight: 500;
    }
    p {
      margin: 0;
      color: var(--secondary-text-color);
    }
    .content-only {
      background: none;
      box-shadow: none;
      border: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-empty-state-card": HuiEmptyStateCard;
  }
}
