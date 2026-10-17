import "@home-assistant/webawesome/dist/components/divider/divider";
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
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { saveConfig } from "../../../data/lovelace/config/types";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
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
  moveCardToContainer,
  moveCardToIndex,
} from "../editor/config-util";
import type { LovelacePath } from "../editor/lovelace-path";
import {
  deleteAtPath,
  getAtPath,
  getParentPath,
  getViewPath,
  normalizeCardPath,
} from "../editor/lovelace-path";
import { showSelectViewDialog } from "../editor/select-view/show-select-view-dialog";
import type { Lovelace, LovelaceCard } from "../types";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("hui-card-options")
export class HuiCardOptions extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ attribute: false }) public path?: LovelacePath;

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

  protected willUpdate(changedProps: PropertyValues<this>) {
    // Temporary compatibility: custom view layouts still set [view, card] index tuples
    if (changedProps.has("path") && this.path) {
      this.path = normalizeCardPath(this.path);
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    if (!changedProps.has("path") || !this.path) {
      return;
    }
    const viewPath = getViewPath(this.path);
    const viewConfig = getAtPath<LovelaceViewConfig>(
      this.lovelace!.config,
      viewPath
    );
    this.classList.toggle("panel", viewConfig?.panel);
  }

  private get _cards() {
    const cardsPath = getParentPath(this.path!);
    return getAtPath<LovelaceCardConfig[]>(this.lovelace!.config, cardsPath)!;
  }

  private get _cardIndex(): number {
    const path = this.path!;
    return path[path.length - 1] as number;
  }

  protected render(): TemplateResult {
    const cardIndex = this._cardIndex;

    return html`
      <div class="card"><slot></slot></div>
      <ha-card>
        <div class="card-actions">
          <ha-button appearance="plain" @click=${this._editCard}
            >${this.hass!.localize(
              "ui.panel.lovelace.editor.edit_card.edit"
            )}</ha-button
          >
          <div class="right">
            <slot name="buttons"></slot>
            ${
              !this.hidePosition
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
                : nothing
            }
            <ha-dropdown
              @wa-select=${this._handleDropdownSelect}
              placement="bottom-end"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.options"
                )}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              <ha-dropdown-item value="move">
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiFileMoveOutline}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.move"
                )}
              </ha-dropdown-item>
              <ha-dropdown-item value="duplicate">
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiPlusCircleMultipleOutline}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.duplicate"
                )}
              </ha-dropdown-item>
              <ha-dropdown-item value="copy">
                <ha-svg-icon slot="icon" .path=${mdiContentCopy}></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.copy"
                )}
              </ha-dropdown-item>
              <ha-dropdown-item value="cut">
                <ha-svg-icon slot="icon" .path=${mdiContentCut}></ha-svg-icon>
                ${this.hass!.localize("ui.panel.lovelace.editor.edit_card.cut")}
              </ha-dropdown-item>
              <wa-divider></wa-divider>
              <ha-dropdown-item value="delete" variant="danger">
                <ha-svg-icon
                  class="warning"
                  slot="icon"
                  .path=${mdiDelete}
                ></ha-svg-icon>
                ${this.hass!.localize(
                  "ui.panel.lovelace.editor.edit_card.delete"
                )}
              </ha-dropdown-item>
            </ha-dropdown>
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
          border-radius: var(--ha-border-radius-circle);
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
      `,
    ];
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "move":
        this._moveCard();
        break;
      case "duplicate":
        this._duplicateCard();
        break;
      case "copy":
        this._copyCard();
        break;
      case "cut":
        this._cutCard();
        break;
      case "delete":
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
    lovelace.saveConfig(
      moveCardToIndex(lovelace.config, path, this._cardIndex - 1)
    );
  }

  private _increaseCardPosition(): void {
    const lovelace = this.lovelace!;
    const path = this.path!;
    lovelace.saveConfig(
      moveCardToIndex(lovelace.config, path, this._cardIndex + 1)
    );
  }

  private async _changeCardPosition(): Promise<void> {
    const lovelace = this.lovelace!;
    const path = this.path!;
    const cardIndex = this._cardIndex;
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

        const toPath: LovelacePath = ["views", viewIndex];

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
          const card = getAtPath<LovelaceCardConfig>(
            this.lovelace.config,
            this.path!
          )!;
          await saveConfig(
            this.hass!,
            urlPath,
            addCard(newConfig, toPath, card)
          );
          this.lovelace!.saveConfig(
            deleteAtPath(this.lovelace!.config, this.path!)
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
