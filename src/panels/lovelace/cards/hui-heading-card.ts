import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-next";
import "../../../components/ha-state-icon";
import { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import "../../../state-display/state-display";
import { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import type {
  LovelaceCard,
  LovelaceCardEditor,
  LovelaceLayoutOptions,
} from "../types";
import type { HeadingCardConfig, HeadingCardEntityConfig } from "./types";

@customElement("hui-heading-card")
export class HuiHeadingCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-heading-card-editor");
    return document.createElement("hui-heading-card-editor");
  }

  public static getStubConfig(hass: HomeAssistant): HeadingCardConfig {
    return {
      type: "heading",
      icon: "mdi:fridge",
      heading: hass.localize("ui.panel.lovelace.cards.heading.default_heading"),
    };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: HeadingCardConfig;

  public setConfig(config: HeadingCardConfig): void {
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
      grid_rows: this._config?.heading_style === "subtitle" ? "auto" : 1,
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

    const style = this._config.heading_style || "title";

    return html`
      <ha-card>
        <div class="container">
          <div
            class="content ${style}"
            @action=${this._handleAction}
            .actionHandler=${actionHandler()}
            role=${ifDefined(actionable ? "button" : undefined)}
            tabindex=${ifDefined(actionable ? "0" : undefined)}
          >
            ${this._config.icon
              ? html`<ha-icon .icon=${this._config.icon}></ha-icon>`
              : nothing}
            ${this._config.heading
              ? html`<p>${this._config.heading}</p>`
              : nothing}
            ${actionable ? html`<ha-icon-next></ha-icon-next>` : nothing}
          </div>
          ${this._config.entities?.length
            ? html`
                <div class="entities">
                  ${this._config.entities.map((config) =>
                    this._renderEntity(config)
                  )}
                </div>
              `
            : nothing}
        </div>
      </ha-card>
    `;
  }

  private _handleEntityAction(ev: ActionHandlerEvent) {
    const config = {
      tap_action: {
        action: "none",
      },
      ...(ev.currentTarget as any).config,
    };

    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  _renderEntity(entityConfig: string | HeadingCardEntityConfig) {
    const config =
      typeof entityConfig === "string"
        ? { entity: entityConfig }
        : entityConfig;

    const stateObj = this.hass!.states[config.entity];

    if (!stateObj) {
      return nothing;
    }

    const actionable = hasAction(config.tap_action || { action: "none" });

    return html`
      <div
        .config=${config}
        class="entity"
        @action=${this._handleEntityAction}
        .actionHandler=${actionHandler()}
        role=${ifDefined(actionable ? "button" : undefined)}
        tabindex=${ifDefined(actionable ? "0" : undefined)}
      >
        <ha-state-icon
          .hass=${this.hass}
          .icon=${config.icon}
          .stateObj=${stateObj}
        ></ha-state-icon>
        <state-display
          .hass=${this.hass}
          .stateObj=${stateObj}
          .content=${config.content || "state"}
        ></state-display>
      </div>
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
        padding: 2px 4px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;
        gap: 8px;
      }
      .content:hover ha-icon-next {
        transform: translateX(calc(4px * var(--scale-direction)));
      }
      .container .content {
        flex: 1 0 fill;
        min-width: 100px;
      }
      .container .content:not(:has(p)) {
        min-width: fit-content;
      }
      .container .entities {
        flex: 0 0;
      }
      .content {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        color: var(--primary-text-color);
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: 0.1px;
        --mdc-icon-size: 16px;
      }
      .content ha-icon,
      .content ha-icon-next {
        display: flex;
        flex: none;
      }
      .content p {
        margin: 0;
        font-family: Roboto;
        font-style: normal;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 1;
        min-width: 0;
      }
      .content.subtitle {
        color: var(--secondary-text-color);
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
      }
      .entities {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: 4px 10px;
      }
      .entities .entity {
        display: flex;
        flex-direction: row;
        white-space: nowrap;
        align-items: center;
        gap: 3px;
        color: var(--secondary-text-color);
        font-family: Roboto;
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        line-height: 20px; /* 142.857% */
        letter-spacing: 0.1px;
        --mdc-icon-size: 14px;
      }
      .entities .entity ha-state-icon {
        --ha-icon-display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-card": HuiHeadingCard;
  }
}
