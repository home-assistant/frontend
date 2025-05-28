import "@material/mwc-button";
import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import {
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiDotsVertical,
  mdiFileMoveOutline,
  mdiMinus,
  mdiPlus,
  mdiPlusCircleMultipleOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { saveConfig } from "../../../data/lovelace/config/types";
import { isStrategyView } from "../../../data/lovelace/config/view";
import {
  showAlertDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { computeCardSize } from "../common/compute-card-size";
import {
  addCard,
  deleteCard,
  moveCardToContainer,
  moveCardToIndex,
} from "../editor/config-util";
import {
  type LovelaceCardPath,
  type LovelaceContainerPath,
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "../editor/lovelace-path";
import { showSelectViewDialog } from "../editor/select-view/show-select-view-dialog";
import type { Lovelace, LovelaceCard } from "../types";

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Array }) public path?: LovelaceCardPath;

  @queryAssignedElements() private _assignedElements?: LovelaceCard[];

  @property({ attribute: "hide-position", type: Boolean })
  public hidePosition = false;

  @storage({
    key: "dashboardCardClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  public getCardSize() {
    return this._assignedElements
      ? computeCardSize(this._assignedElements[0])
      : 1;
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("path") || !this.path) {
      return;
    }
    const { viewIndex } = parseLovelaceCardPath(this.path);
    this.classList.toggle(
      "panel",
      this.lovelace!.config.views[viewIndex].panel
    );
  }

  private get _cards() {
    const containerPath = getLovelaceContainerPath(this.path!);
    return findLovelaceItems("cards", this.lovelace!.config, containerPath)!;
  }

  protected render(): TemplateResult {
    const { cardIndex } = parseLovelaceCardPath(this.path!);

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
                      "ui.panel.lovelace.editor.edit_card.decrease_position"
                    )}
                    .path=${mdiMinus}
                    class="move-arrow"
                    @click=${this._decreaseCardPosiion}
                    ?disabled=${cardIndex === 0}
                  ></ha-icon-button>
                  <ha-icon-button
                    @click=${this._changeCardPosition}
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.change_position"
                    )}
                  >
                    <div class="position-badge">${cardIndex + 1}</div>
                  </ha-icon-button>
                  <ha-icon-button
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.increase_position"
                    )}
                    .path=${mdiPlus}
                    class="move-arrow"
                    @click=${this._increaseCardPosition}
                    .disabled=${this._cards!.length === cardIndex + 1}
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
              <ha-list-item graphic="icon">
                <ha-svg-icon
                  slot="graphic"
                  .path=${mdiFileMoveOutline}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.move"
                )}
              </ha-list-item>
              <ha-list-item graphic="icon">
                <ha-svg-icon
                  slot="graphic"
                  .path=${mdiPlusCircleMultipleOutline}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.duplicate"
                )}
              </ha-list-item>
              <ha-list-item graphic="icon">
                <ha-svg-icon
                  slot="graphic"
                  .path=${mdiContentCopy}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.copy"
                )}
              </ha-list-item>
              <ha-list-item graphic="icon">
                <ha-svg-icon
                  slot="graphic"
                  .path=${mdiContentCut}
                ></ha-svg-icon>
                ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.cut")}
              </ha-list-item>
              <li divider role="separator"></li>
              <ha-list-item class="warning" graphic="icon">
                <ha-svg-icon
                  class="warning"
                  slot="graphic"
                  .path=${mdiDelete}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.delete"
                )}
              </ha-list-item>
            </ha-button-menu>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
          line-height: var(--ha-line-height-normal);
          box-sizing: border-box;
          border-radius: 50%;
          font-weight: var(--ha-font-weight-medium);
          text-align: center;
          font-size: var(--ha-font-size-m);
          background-color: var(--app-header-edit-background-color, #455a64);
          color: var(--app-header-edit-text-color, white);
        }

        ha-icon-button {
          color: var(--primary-text-color);
        }

        ha-icon-button.move-arrow[disabled] {
          color: var(--disabled-text-color);
        }

        ha-list-item {
          cursor: pointer;
          white-space: nowrap;
        }
      `,
    ];
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
        this._deleteCard();
        break;
    }
  }

  private _duplicateCard(): void {
    fireEvent(this, "ll-duplicate-card", { path: this.path! });
  }

  private _editCard(): void {
    fireEvent(this, "ll-edit-card", { path: this.path! });
  }

  private _cutCard(): void {
    fireEvent(this, "ll-copy-card", { path: this.path! });
    fireEvent(this, "ll-delete-card", { path: this.path!, silent: true });
  }

  private _copyCard(): void {
    fireEvent(this, "ll-copy-card", { path: this.path! });
  }

  private _deleteCard(): void {
    fireEvent(this, "ll-delete-card", { path: this.path!, silent: false });
  }

  private _decreaseCardPosiion(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    const { cardIndex } = parseLovelaceCardPath(path);
    lovelace.saveConfig(moveCardToIndex(lovelace.config, path, cardIndex - 1));
  }

  private _increaseCardPosition(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    const { cardIndex } = parseLovelaceCardPath(path);
    lovelace.saveConfig(moveCardToIndex(lovelace.config, path, cardIndex + 1));
  }

  private async _changeCardPosition(): Promise<void> {
    const lovelace = this.lovelace!;
    const path = this.path!;
    const { cardIndex } = parseLovelaceCardPath(path);
    const positionString = await showPromptDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.editor.change_position.title"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.change_position.text"
      ),
      inputType: "number",
      inputMin: "1",
      placeholder: String(cardIndex + 1),
    });

    if (!positionString) return;

    const position = parseInt(positionString);

    if (isNaN(position)) return;

    const newIndex = position - 1;
    lovelace.saveConfig(moveCardToIndex(lovelace.config, path, newIndex));
  }

  private _moveCard(): void {
    showSelectViewDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      urlPath: this.lovelace!.urlPath,
      allowDashboardChange: true,
      header: this.hass!.localize("ui.panel.lovelace.editor.move_card.header"),
      viewSelectedCallback: async (urlPath, selectedDashConfig, viewIndex) => {
        if (!this.lovelace) return;
        const toView = selectedDashConfig.views[viewIndex];
        const newConfig = selectedDashConfig;

        const undoAction = async () => {
          this.lovelace!.saveConfig(selectedDashConfig);
        };

        if (isStrategyView(toView)) {
          showAlertDialog(this, {
            title: this.hass!.localize(
              "ui.panel.lovelace.editor.move_card.error_title"
            ),
            text: this.hass!.localize(
              "ui.panel.lovelace.editor.move_card.error_text_strategy"
            ),
            warning: true,
          });
          return;
        }

        const toPath: LovelaceContainerPath = [viewIndex];

        if (urlPath === this.lovelace!.urlPath) {
          this.lovelace!.saveConfig(
            moveCardToContainer(newConfig, this.path!, toPath)
          );
          this.lovelace.showToast({
            message: this.hass!.localize(
              "ui.panel.lovelace.editor.move_card.success"
            ),
            duration: 4000,
            action: {
              action: undoAction,
              text: this.hass!.localize("ui.common.undo"),
            },
          });
          return;
        }
        try {
          const { cardIndex } = parseLovelaceCardPath(this.path!);
          const card = this._cards[cardIndex];
          await saveConfig(
            this.hass!,
            urlPath,
            addCard(newConfig, toPath, card)
          );
          this.lovelace!.saveConfig(
            deleteCard(this.lovelace!.config, this.path!)
          );

          this.lovelace.showToast({
            message: this.hass!.localize(
              "ui.panel.lovelace.editor.move_card.success"
            ),
            duration: 4000,
            action: {
              action: undoAction,
              text: this.hass!.localize("ui.common.undo"),
            },
          });
        } catch (_err: any) {
          this.lovelace.showToast({
            message: this.hass!.localize(
              "ui.panel.lovelace.editor.move_card.error"
            ),
          });
        }
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-options": HuiCardOptions;
  }
}
