import { html, LitElement, PropertyDeclarations } from "lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-listbox/paper-listbox";

import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { confDeleteCard } from "../editor/delete-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { Lovelace } from "../types";
import { swapCard } from "../editor/config-util";
import { showMoveCardViewDialog } from "../editor/card-editor/show-move-card-view-dialog";

export class HuiCardOptions extends LitElement {
  public cardConfig?: LovelaceCardConfig;
  public hass?: HomeAssistant;
  public lovelace?: Lovelace;
  public path?: [number, number];

  static get properties(): PropertyDeclarations {
    return { hass: {}, lovelace: {}, path: {} };
  }

  protected render() {
    return html`
      <style>
        div.options {
          border-top: 1px solid #e8e8e8;
          padding: 5px 8px;
          background: var(--paper-card-background-color, white);
          box-shadow: rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
            rgba(0, 0, 0, 0.12) 0px 1px 5px -4px,
            rgba(0, 0, 0, 0.2) 0px 3px 1px -2px;
          display: flex;
        }
        div.options .primary-actions {
          flex: 1;
          margin: auto;
        }
        div.options .secondary-actions {
          flex: 4;
          text-align: right;
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
        }
        paper-icon-button {
          color: var(--primary-text-color);
        }
        paper-icon-button.move-arrow[disabled] {
          color: var(--disabled-text-color);
        }
        paper-menu-button {
          color: var(--secondary-text-color);
          padding: 0;
        }
        paper-item.header {
          color: var(--primary-text-color);
          text-transform: uppercase;
          font-weight: 500;
          font-size: 14px;
        }
        paper-item {
          cursor: pointer;
        }
      </style>
      <slot></slot>
      <div class="options">
        <div class="primary-actions">
          <paper-button @click="${this._editCard}"
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_card.edit"
            )}</paper-button
          >
        </div>
        <div class="secondary-actions">
          <paper-icon-button
            title="Move card down"
            class="move-arrow"
            icon="hass:arrow-down"
            @click="${this._cardDown}"
            ?disabled="${this.lovelace!.config.views[this.path![0]].cards!
              .length ===
              this.path![1] + 1}"
          ></paper-icon-button>
          <paper-icon-button
            title="Move card up"
            class="move-arrow"
            icon="hass:arrow-up"
            @click="${this._cardUp}"
            ?disabled="${this.path![1] === 0}"
          ></paper-icon-button>
          <paper-menu-button>
            <paper-icon-button
              icon="hass:dots-vertical"
              slot="dropdown-trigger"
            ></paper-icon-button>
            <paper-listbox slot="dropdown-content">
              <paper-item @click="${this._moveCard}">Move Card</paper-item>
              <paper-item @click="${this._deleteCard}"
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.delete"
                )}</paper-item
              >
            </paper-listbox>
          </paper-menu-button>
        </div>
      </div>
    `;
  }

  private _editCard(): void {
    showEditCardDialog(this, {
      lovelace: this.lovelace!,
      path: this.path!,
    });
  }

  private _cardUp(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    lovelace.saveConfig(
      swapCard(lovelace.config, path, [path[0], path[1] - 1])
    );
  }

  private _cardDown(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    lovelace.saveConfig(
      swapCard(lovelace.config, path, [path[0], path[1] + 1])
    );
  }

  private _moveCard(): void {
    showMoveCardViewDialog(this, {
      path: this.path!,
      lovelace: this.lovelace!,
    });
  }

  private _deleteCard(): void {
    confDeleteCard(this.lovelace!, this.path!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}

customElements.define("hui-card-options", HuiCardOptions);
