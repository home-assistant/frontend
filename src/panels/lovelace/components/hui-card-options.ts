import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowDown, mdiArrowUp, mdiDotsVertical } from "@mdi/js";
import deepClone from "deep-clone-simple";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, queryAssignedNodes } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import { LovelaceCardConfig, saveConfig } from "../../../data/lovelace";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showSaveSuccessToast } from "../../../util/toast-saved-success";
import { computeCardSize } from "../common/compute-card-size";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import {
  addCard,
  deleteCard,
  moveCard,
  moveCardToPosition,
  swapCard,
} from "../editor/config-util";
import { showSelectViewDialog } from "../editor/select-view/show-select-view-dialog";
import { Lovelace, LovelaceCard } from "../types";

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property() public path?: [number, number];

  @queryAssignedNodes() private _assignedNodes?: NodeListOf<LovelaceCard>;

  @property({ type: Boolean }) public hidePosition = false;

  @storage({
    key: "lovelaceClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  public getCardSize() {
    return this._assignedNodes ? computeCardSize(this._assignedNodes[0]) : 1;
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("path") || !this.path) {
      return;
    }
    this.classList.toggle(
      "panel",
      this.lovelace!.config.views[this.path![0]].panel
    );
  }

  protected render(): TemplateResult {
    return html`
      <div class="card"><slot></slot></div>
      <ha-card>
        <div class="card-actions">
          <mwc-button @click=${this._editCard}
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_card.edit"
            )}</mwc-button
          >
          <div class="right">
            <slot name="buttons"></slot>
            ${!this.hidePosition
              ? html`
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_down"
                    )}
                    .path=${mdiArrowDown}
                    class="move-arrow"
                    @click=${this._cardDown}
                    .disabled=${this.lovelace!.config.views[this.path![0]]
                      .cards!.length ===
                    this.path![1] + 1}
                  ></ha-icon-button>
                  <ha-icon-button
                    @click=${this._changeCardPosition}
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.change_position"
                    )}
                  >
                    <div class="position-badge">${this.path![1] + 1}</div>
                  </ha-icon-button>
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_up"
                    )}
                    .path=${mdiArrowUp}
                    class="move-arrow"
                    @click=${this._cardUp}
                    ?disabled=${this.path![1] === 0}
                  ></ha-icon-button>
                `
              : nothing}
            <ha-button-menu @action=${this._handleAction}>
              <ha-icon-button
                slot="trigger"
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.options"
                )}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <mwc-list-item>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.move"
                )}</mwc-list-item
              >
              <mwc-list-item
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.duplicate"
                )}</mwc-list-item
              >
              <mwc-list-item
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.copy"
                )}</mwc-list-item
              >
              <mwc-list-item
                >${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.cut"
                )}</mwc-list-item
              >
              <mwc-list-item class="delete-item">
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

  static get styles(): CSSResultGroup {
    return css`
      :host(:hover) {
        outline: 2px solid var(--primary-color);
      }

      :host(:not(.panel)) ::slotted(*) {
        display: block;
      }

      :host(.panel) .card {
        height: calc(100% - 59px);
      }

      ha-card {
        border-top-right-radius: 0;
        border-top-left-radius: 0;
      }

      .card-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .right {
        display: flex;
        align-items: center;
      }

      .position-badge {
        display: block;
        width: 24px;
        line-height: 24px;
        box-sizing: border-box;
        border-radius: 50%;
        font-weight: 500;
        text-align: center;
        font-size: 14px;
        background-color: var(--app-header-edit-background-color, #455a64);
        color: var(--app-header-edit-text-color, white);
      }

      ha-icon-button {
        color: var(--primary-text-color);
      }

      ha-icon-button.move-arrow[disabled] {
        color: var(--disabled-text-color);
      }

      mwc-list-item {
        cursor: pointer;
        white-space: nowrap;
      }

      mwc-list-item.delete-item {
        color: var(--error-color);
      }
    `;
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._moveCard();
        break;
      case 1:
        this._duplicateCard();
        break;
      case 2:
        this._copyCard();
        break;
      case 3:
        this._cutCard();
        break;
      case 4:
        this._deleteCard(true);
        break;
    }
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
    fireEvent(this, "ll-edit-card", { path: this.path! });
  }

  private _cutCard(): void {
    this._copyCard();
    this._deleteCard(false);
  }

  private _copyCard(): void {
    const cardConfig =
      this.lovelace!.config.views[this.path![0]].cards![this.path![1]];
    this._clipboard = deepClone(cardConfig);
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

  private async _changeCardPosition(): Promise<void> {
    const lovelace = this.lovelace!;
    const path = this.path!;

    const positionString = await showPromptDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.editor.change_position.title"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.change_position.text"
      ),
      inputType: "number",
      inputMin: "1",
      placeholder: String(path[1] + 1),
    });

    if (!positionString) return;

    const position = parseInt(positionString);

    if (isNaN(position)) return;

    lovelace.saveConfig(moveCardToPosition(lovelace.config, path, position));
  }

  private _moveCard(): void {
    showSelectViewDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      urlPath: this.lovelace!.urlPath,
      allowDashboardChange: true,
      header: this.hass!.localize("ui.panel.lovelace.editor.move_card.header"),
      viewSelectedCallback: async (urlPath, selectedDashConfig, viewIndex) => {
        if (urlPath === this.lovelace!.urlPath) {
          this.lovelace!.saveConfig(
            moveCard(this.lovelace!.config, this.path!, [viewIndex])
          );
          showSaveSuccessToast(this, this.hass!);
          return;
        }
        try {
          await saveConfig(
            this.hass!,
            urlPath,
            addCard(
              selectedDashConfig,
              [viewIndex],
              this.lovelace!.config.views[this.path![0]].cards![this.path![1]]
            )
          );
          this.lovelace!.saveConfig(
            deleteCard(this.lovelace!.config, this.path!)
          );
          showSaveSuccessToast(this, this.hass!);
        } catch (err: any) {
          showAlertDialog(this, {
            text: `Moving failed: ${err.message}`,
          });
        }
      },
    });
  }

  private _deleteCard(confirm: boolean): void {
    fireEvent(this, "ll-delete-card", { path: this.path!, confirm });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}
