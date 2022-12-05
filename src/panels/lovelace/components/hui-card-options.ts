import "@material/mwc-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiArrowDown, mdiArrowUp, mdiDotsVertical } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, queryAssignedNodes } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import { saveConfig } from "../../../data/lovelace";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showSaveSuccessToast } from "../../../util/toast-saved-success";
import { computeCardSize } from "../common/compute-card-size";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { addCard, deleteCard, moveCard, swapCard } from "../editor/config-util";
import { showSelectViewDialog } from "../editor/select-view/show-select-view-dialog";
import { Lovelace, LovelaceCard } from "../types";

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property() public path?: [number, number];

  @queryAssignedNodes() private _assignedNodes?: NodeListOf<LovelaceCard>;

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
          <div>
            <slot name="buttons"></slot>
            <ha-icon-button
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.move_down"
              )}
              .path=${mdiArrowDown}
              class="move-arrow"
              @click=${this._cardDown}
              .disabled=${this.lovelace!.config.views[this.path![0]].cards!
                .length ===
              this.path![1] + 1}
            ></ha-icon-button>
            <ha-icon-button
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.move_up"
              )}
              .path=${mdiArrowUp}
              class="move-arrow"
              @click=${this._cardUp}
              ?disabled=${this.path![1] === 0}
            ></ha-icon-button>
            <ha-button-menu corner="BOTTOM_START" @action=${this._handleAction}>
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
        this._deleteCard();
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

  private _deleteCard(): void {
    fireEvent(this, "ll-delete-card", { path: this.path! });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}
