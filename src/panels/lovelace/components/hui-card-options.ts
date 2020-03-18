import {
  html,
  LitElement,
  customElement,
  property,
  css,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@material/mwc-button";
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

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  public cardConfig?: LovelaceCardConfig;

  @property() public hass?: HomeAssistant;

  @property() public lovelace?: Lovelace;

  @property() public path?: [number, number];

  protected render(): TemplateResult {
    return html`
      <slot></slot>
      <ha-card>
        <div class="options">
          <div class="primary-actions">
            <mwc-button @click="${this._editCard}"
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.edit"
              )}</mwc-button
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
            <paper-menu-button
              horizontal-align="right"
              vertical-align="bottom"
              vertical-offset="40"
              close-on-activate
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
                aria-label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.options"
                )}
              ></paper-icon-button>
              <paper-listbox slot="dropdown-content">
                <paper-item @tap="${this._moveCard}">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.move"
                  )}</paper-item
                >
                <paper-item @tap=${this._duplicateCard}
                  >${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.duplicate"
                  )}</paper-item
                >
                <paper-item .class="delete-item" @tap="${this._deleteCard}">
                  ${this.hass!.localize(
                    "ui.panel.lovelace.editor.edit_card.delete"
                  )}</paper-item
                >
              </paper-listbox>
            </paper-menu-button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host(:hover) {
        outline: 2px solid var(--primary-color);
      }

      ha-card {
        border-top-right-radius: 0;
        border-top-left-radius: 0;
        box-shadow: rgba(0, 0, 0, 0.14) 0px 2px 2px 0px,
          rgba(0, 0, 0, 0.12) 0px 1px 5px -4px,
          rgba(0, 0, 0, 0.2) 0px 3px 1px -2px;
      }

      div.options {
        border-top: 1px solid #e8e8e8;
        padding: 5px 8px;
        display: flex;
        margin-top: -1px;
      }

      div.options .primary-actions {
        flex: 1;
        margin: auto;
      }

      div.options .secondary-actions {
        flex: 4;
        text-align: right;
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

      paper-item.delete-item {
        color: var(--google-red-500);
      }
    `;
  }

  private _duplicateCard(): void {
    const path = this.path!;
    const cardConfig = this.lovelace!.config.views[path[0]].cards![path[1]];
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      cardConfig,
      saveConfig: this.lovelace!.saveConfig,
      path: [path[0]],
    });
  }

  private _editCard(): void {
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
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
    confDeleteCard(this, this.hass!, this.lovelace!, this.path!);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}
