import "@material/mwc-button";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-icon-button";
import "../../../components/ha-button-menu";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  queryAssignedNodes,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { showMoveCardViewDialog } from "../editor/card-editor/show-move-card-view-dialog";
import { swapCard } from "../editor/config-util";
import { confDeleteCard } from "../editor/delete-card";
import { Lovelace, LovelaceCard } from "../types";
import { computeCardSize } from "../common/compute-card-size";
import { mdiDotsVertical, mdiArrowDown, mdiArrowUp } from "@mdi/js";

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public lovelace?: Lovelace;

  @property() public path?: [number, number];

  @queryAssignedNodes() private _assignedNodes?: NodeListOf<LovelaceCard>;

  public getCardSize() {
    return this._assignedNodes ? computeCardSize(this._assignedNodes[0]) : 1;
  }

  protected render(): TemplateResult {
    return html`
      <slot></slot>
      <ha-card>
        <div class="options">
          <div class="primary-actions">
            <mwc-button @click=${this._editCard}
              >${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.edit"
              )}</mwc-button
            >
          </div>
          <div class="secondary-actions">
            <mwc-icon-button
              title="Move card down"
              class="move-arrow"
              @click=${this._cardDown}
              ?disabled=${this.lovelace!.config.views[this.path![0]].cards!
                .length ===
              this.path![1] + 1}
            >
              <ha-svg-icon path=${mdiArrowDown}></ha-svg-icon>
            </mwc-icon-button>
            <mwc-icon-button
              title="Move card up"
              class="move-arrow"
              @click=${this._cardUp}
              ?disabled=${this.path![1] === 0}
              ><ha-svg-icon path=${mdiArrowUp}></ha-svg-icon
            ></mwc-icon-button>
            <ha-button-menu corner="BOTTOM_START">
              <mwc-icon-button
                slot="trigger"
                aria-label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.options"
                )}
                title="${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.options"
                )}"
              >
                <ha-svg-icon path=${mdiDotsVertical}></ha-svg-icon>
              </mwc-icon-button>

              <mwc-list-item @tap=${this._moveCard}>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.move"
                )}</mwc-list-item
              >
              <mwc-list-item @tap=${this._duplicateCard}
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.duplicate"
                )}</mwc-list-item
              >
              <mwc-list-item class="delete-item" @tap=${this._deleteCard}>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.delete"
                )}</mwc-list-item
              >
            </ha-button-menu>
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

      mwc-icon-button {
        color: var(--primary-text-color);
      }

      mwc-icon-button.move-arrow[disabled] {
        color: var(--disabled-text-color);
      }

      paper-item.header {
        color: var(--primary-text-color);
        text-transform: uppercase;
        font-weight: 500;
        font-size: 14px;
      }

      paper-item {
        cursor: pointer;
        white-space: nowrap;
      }

      paper-item.delete-item {
        color: var(--error-color);
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
