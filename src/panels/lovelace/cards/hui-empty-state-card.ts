import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { ifDefined } from "lit/directives/if-defined";
import { computeCssColor } from "../../../common/color/compute-color";
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
            ? html`
                <ha-icon
                  class="card-icon"
                  .icon=${this._config.icon}
                  style=${styleMap({
                    color: this._config.icon_color
                      ? computeCssColor(this._config.icon_color)
                      : undefined,
                  })}
                ></ha-icon>
              `
            : nothing}
          ${this._config.title ? html`<h1>${this._config.title}</h1>` : nothing}
          ${this._config.content
            ? html`<p>${this._config.content}</p>`
            : nothing}
          ${this._config.buttons?.length
            ? html`
                <div class="buttons">
                  ${this._config.buttons.map(
                    (button, index) => html`
                      <ha-button
                        .index=${index}
                        @click=${this._handleButtonAction}
                        appearance=${ifDefined(button.appearance)}
                        variant=${ifDefined(button.variant)}
                      >
                        ${button.icon
                          ? html`<ha-icon
                              slot="start"
                              .icon=${button.icon}
                            ></ha-icon>`
                          : nothing}
                        ${button.text}
                      </ha-button>
                    `
                  )}
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _handleButtonAction(ev: Event): void {
    const index = (ev.currentTarget as any).index;
    const button = this._config?.buttons?.[index];
    if (this.hass && button) {
      handleAction(this, this.hass, { tap_action: button.tap_action }, "tap");
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
    .card-icon {
      --mdc-icon-size: var(--ha-space-16);
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
    .buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--ha-space-2);
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
