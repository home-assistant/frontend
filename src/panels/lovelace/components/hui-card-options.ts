import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-listbox/paper-listbox";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { confDeleteCard } from "../editor/delete-card";
import { HomeAssistant } from "../../../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { Lovelace } from "../types";
import { swapCard, moveCard } from "../editor/config-util";

export class HuiCardOptions extends hassLocalizeLitMixin(LitElement) {
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
        div {
          border-top: 1px solid #e8e8e8;
          padding: 5px 16px;
          background: var(--paper-card-background-color, white);
          box-shadow: rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
            rgba(0, 0, 0, 0.12) 0px 1px 5px 0px,
            rgba(0, 0, 0, 0.2) 0px 3px 1px -2px;
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
        }
        paper-icon-button {
          color: var(--primary-text-color);
        }
        paper-icon-button.delete {
          color: var(--secondary-text-color);
          float: right;
        }
        paper-item.header {
          color: var(--primary-text-color);
          text-transform: uppercase;
          font-weight: 500;
          font-size: 14px;
        }
      </style>
      <slot></slot>
      <div>
        <paper-button @click="${this._editCard}"
          >${
            this.localize("ui.panel.lovelace.editor.edit_card.edit")
          }</paper-button
        >
        <paper-icon-button
          icon="hass:arrow-up"
          @click="${this._cardUp}"
          ?disabled="${this.path![1] === 0}"
        ></paper-icon-button>
        <paper-icon-button
          icon="hass:arrow-down"
          @click="${this._cardDown}"
          ?disabled="${
            this.lovelace!.config.views[this.path![0]].cards!.length ===
              this.path![1] + 1
          }"
        ></paper-icon-button>
        <paper-menu-button vertical-offset="48">
          <paper-icon-button
            title="Move card to a different view"
            icon="hass:file-replace"
            ?disabled="${this.lovelace!.config.views.length === 1}"
            slot="dropdown-trigger"
          ></paper-icon-button>
          <paper-listbox on-iron-select="_deselect" slot="dropdown-content">
            <paper-item disabled class="header">Move card to view</paper-item>
            ${
              this.lovelace!.config.views.map((view, index) => {
                if (index === this.path![0]) {
                  return;
                }
                return html`
                  <paper-item @click="${this._moveCard}" .index="${index}"
                    >${view.title || "Unnamed view"}</paper-item
                  >
                `;
              })
            }
          </paper-listbox>
        </paper-menu-button>
        <paper-icon-button
          class="delete"
          icon="hass:delete"
          @click="${this._deleteCard}"
          title="${this.localize("ui.panel.lovelace.editor.edit_card.delete")}"
        ></paper-icon-button>
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

  private _moveCard(ev: MouseEvent): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    lovelace.saveConfig(
      moveCard(lovelace.config, path, [(ev.currentTarget! as any).index])
    );
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
