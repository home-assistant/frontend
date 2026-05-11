import {
  mdiCodeBraces,
  mdiContentCopy,
  mdiContentCut,
  mdiDelete,
  mdiListBoxOutline,
  mdiPlus,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import { storage } from "../../../../common/decorators/storage";
import type { HASSDomEvent } from "../../../../common/dom/fire_event";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-arrow-next";
import "../../../../components/ha-icon-button-arrow-prev";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { HuiCardElementEditor } from "./hui-card-element-editor";
import "./hui-card-element-editor";
import "./hui-card-picker";
import type { ConfigChangedEvent } from "../hui-element-editor";
import type { GUIModeChangedEvent } from "../types";

export interface CardsChangedEvent {
  cards: LovelaceCardConfig[];
  guiModeAvailable?: boolean;
}

declare global {
  interface HASSDomEvents {
    "cards-changed": CardsChangedEvent;
  }
}

@customElement("hui-card-list-editor")
export class HuiCardListEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @property({ attribute: false }) public cards: LovelaceCardConfig[] = [];

  @property({ type: Boolean, attribute: "show-copy-cut" })
  public showCopyCut = false;

  @storage({
    key: "dashboardCardClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  @state() private _selectedCard = 0;

  @state() private _guiMode = true;

  @state() private _guiModeAvailable? = true;

  @query("hui-card-element-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  private _keys = new Map<string, string>();

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  protected render() {
    const selected = this._selectedCard;
    const isGuiMode = !this._cardEditorEl || this._guiMode;

    return html`
      <div class="card-config">
        <div class="toolbar">
          <ha-tab-group @wa-tab-show=${this._handleSelectedCard}>
            ${this.cards.map(
              (_card, index) => html`
                <ha-tab-group-tab
                  slot="nav"
                  .panel=${index}
                  .active=${index === selected}
                >
                  ${index + 1}
                </ha-tab-group-tab>
              `
            )}
          </ha-tab-group>
          <ha-icon-button
            @click=${this._handleAddCard}
            .path=${mdiPlus}
            .label=${this.hass!.localize(
              "ui.panel.lovelace.editor.card.generic.add_card"
            )}
          ></ha-icon-button>
        </div>

        <div class="editor">
          ${selected < this.cards.length
            ? html`
                <div class="card-options">
                  <ha-icon-button
                    class="gui-mode-button"
                    @click=${this._toggleMode}
                    .disabled=${!this._guiModeAvailable}
                    .label=${this.hass!.localize(
                      isGuiMode
                        ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                        : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                    )}
                    .path=${isGuiMode ? mdiCodeBraces : mdiListBoxOutline}
                  ></ha-icon-button>

                  <ha-icon-button-arrow-prev
                    .disabled=${selected === 0}
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_before"
                    )}
                    @click=${this._handleMove}
                    .move=${-1}
                  ></ha-icon-button-arrow-prev>

                  <ha-icon-button-arrow-next
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_after"
                    )}
                    .disabled=${selected === this.cards.length - 1}
                    @click=${this._handleMove}
                    .move=${1}
                  ></ha-icon-button-arrow-next>

                  ${this.showCopyCut
                    ? html`
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            "ui.panel.lovelace.editor.edit_card.copy"
                          )}
                          .path=${mdiContentCopy}
                          @click=${this._handleCopyCard}
                        ></ha-icon-button>

                        <ha-icon-button
                          .label=${this.hass!.localize(
                            "ui.panel.lovelace.editor.edit_card.cut"
                          )}
                          .path=${mdiContentCut}
                          @click=${this._handleCutCard}
                        ></ha-icon-button>
                      `
                    : ""}

                  <ha-icon-button
                    .label=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.delete"
                    )}
                    .path=${mdiDelete}
                    @click=${this._handleDeleteCard}
                  ></ha-icon-button>
                </div>
                ${keyed(
                  this._getKey(this.cards, selected),
                  html`<hui-card-element-editor
                    .hass=${this.hass}
                    .value=${this.cards[selected]}
                    .lovelace=${this.lovelace}
                    @config-changed=${this._handleConfigChanged}
                    @GUImode-changed=${this._handleGUIModeChanged}
                  ></hui-card-element-editor>`
                )}
              `
            : html`
                <hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._handleCardPicked}
                ></hui-card-picker>
              `}
        </div>
      </div>
    `;
  }

  private _getKey(cards: LovelaceCardConfig[], index: number): string {
    const key = `${index}-${cards.length}`;
    if (!this._keys.has(key)) {
      this._keys.set(key, Math.random().toString());
    }

    return this._keys.get(key)!;
  }

  private _handleAddCard() {
    this._selectedCard = this.cards.length;
  }

  private _handleSelectedCard(ev) {
    this._guiMode = true;
    this._guiModeAvailable = true;
    this._selectedCard = parseInt(ev.detail.name, 10);
  }

  private _handleConfigChanged(ev: HASSDomEvent<ConfigChangedEvent>) {
    ev.stopPropagation();
    const cards = [...this.cards];
    cards[this._selectedCard] = ev.detail.config as LovelaceCardConfig;
    this._fireCardsChanged(cards, ev.detail.guiModeAvailable);
  }

  private _handleCardPicked(ev: HASSDomEvent<ConfigChangedEvent>) {
    ev.stopPropagation();
    this._keys.clear();
    this._fireCardsChanged([
      ...this.cards,
      ev.detail.config as LovelaceCardConfig,
    ]);
  }

  private _handleCopyCard() {
    this._clipboard = deepClone(this.cards[this._selectedCard]);
  }

  private _handleCutCard() {
    this._handleCopyCard();
    this._handleDeleteCard();
  }

  private _handleDeleteCard() {
    const cards = [...this.cards];
    cards.splice(this._selectedCard, 1);
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    this._keys.clear();
    this._fireCardsChanged(cards);
  }

  private _handleMove(ev: Event) {
    const move = (ev.currentTarget as HTMLElement & { move: number }).move;
    const target = this._selectedCard + move;
    const cards = [...this.cards];
    const card = cards.splice(this._selectedCard, 1)[0];
    cards.splice(target, 0, card);
    this._selectedCard = target;
    this._keys.clear();
    this._fireCardsChanged(cards);
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._guiMode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _fireCardsChanged(
    cards: LovelaceCardConfig[],
    guiModeAvailable?: boolean
  ) {
    fireEvent(this, "cards-changed", { cards, guiModeAvailable });
  }

  static styles = css`
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ha-tab-group {
      flex-grow: 1;
      min-width: 0;
      --ha-tab-track-color: var(--card-background-color);
    }
    .card-options {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
    .editor {
      border: 1px solid var(--divider-color);
      padding: 12px;
    }
    @media (max-width: 450px) {
      .editor {
        margin: 0 -12px;
      }
    }
    .gui-mode-button {
      margin-right: auto;
      margin-inline-end: auto;
      margin-inline-start: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-list-editor": HuiCardListEditor;
  }
}
