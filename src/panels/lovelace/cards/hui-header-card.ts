import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceLayoutOptions,
} from "../types";
import type { HeaderCardConfig } from "./types";

@customElement("hui-header-card")
export class HuiHeaderCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-header-card-editor");
    return document.createElement("hui-header-card-editor");
  }

  public static getStubConfig(): HeaderCardConfig {
    return {
      type: "header",
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HeaderCardConfig;

  public setConfig(config: HeaderCardConfig): void {
    this._config = {
      tap_action: {
        action: "none",
      },
      ...config,
    };
  }

  public getCardSize(): number {
    return 1;
  }

  public getLayoutOptions(): LovelaceLayoutOptions {
    return {
      grid_columns: "full",
      grid_rows: 1,
    };
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    const actionable = hasAction(this._config.tap_action);

    return html`
      <ha-card>
        <div class="container">
          <div
            class="content"
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
            role=${ifDefined(actionable ? "button" : undefined)}
            tabindex=${ifDefined(actionable ? "0" : undefined)}
          >
            ${this._config.icon
              ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
              : nothing}
            <p>${this._config.title}</p>
            ${actionable ? html`<ha-icon-next></ha-icon-next>` : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        background: none;
        border: none;
        box-shadow: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        height: 100%;
      }
      [role="button"] {
        cursor: pointer;
      }
      ha-icon-next {
        display: inline-block;
        transition: transform 180ms ease-in-out;
      }
      .container {
        padding: 4px;
      }
      .content:hover ha-icon-next {
        transform: translateX(calc(4px * var(--scale-direction)));
      }
      .content {
        display: flex;
        flex-direction: row;

        gap: 8px;
        flex: 1;
        min-width: 0;
        color: var(--primary-text-color);
      }
      .content ha-icon,
      .content ha-icon-next {
        padding: 2px 0;
        --mdc-icon-size: 20px;
        display: flex;
        flex: none;
      }
      .content p {
        margin: 0;
        font-family: Roboto;
        font-size: 16px;
        font-style: normal;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: 0.1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 1;
        min-width: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-header-card": HuiHeaderCard;
  }
}
