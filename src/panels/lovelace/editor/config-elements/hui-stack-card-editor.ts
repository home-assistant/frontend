import "../../../../components/ha-icon-button";
import "@polymer/paper-tabs";
import "@polymer/paper-tabs/paper-tab";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { StackCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import {
  ConfigChangedEvent,
  HuiCardEditor,
} from "../card-editor/hui-card-editor";
import "../card-editor/hui-card-picker";
import { GUIModeChangedEvent } from "../types";
import { assert, object, string, array, any, optional } from "superstruct";

const cardConfigStruct = object({
  type: string(),
  cards: array(any()),
  title: optional(string()),
});

@customElement("hui-stack-card-editor")
export class HuiStackCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @internalProperty() private _config?: StackCardConfig;

  @internalProperty() private _selectedCard = 0;

  @internalProperty() private _GUImode = true;

  @internalProperty() private _guiModeAvailable? = true;

  @query("hui-card-editor") private _cardEditorEl?: HuiCardEditor;

  public setConfig(config: Readonly<StackCardConfig>): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  public refreshYamlEditor(focus) {
    this._cardEditorEl?.refreshYamlEditor(focus);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const selected = this._selectedCard!;
    const numcards = this._config.cards.length;

    return html`
      <div class="card-config">
        <div class="toolbar">
          <paper-tabs
            .selected=${selected}
            scrollable
            @iron-activate=${this._handleSelectedCard}
          >
            ${this._config.cards.map((_card, i) => {
              return html`
                <paper-tab>
                  ${i + 1}
                </paper-tab>
              `;
            })}
          </paper-tabs>
          <paper-tabs
            id="add-card"
            .selected=${selected === numcards ? "0" : undefined}
            @iron-activate=${this._handleSelectedCard}
          >
            <paper-tab>
              <ha-icon icon="hass:plus"></ha-icon>
            </paper-tab>
          </paper-tabs>
        </div>

        <div id="editor">
          ${selected < numcards
            ? html`
                <div id="card-options">
                  <mwc-button
                    @click=${this._toggleMode}
                    .disabled=${!this._guiModeAvailable}
                    class="gui-mode-button"
                  >
                    ${this.hass!.localize(
                      !this._cardEditorEl || this._GUImode
                        ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                        : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
                    )}
                  </mwc-button>
                  <ha-icon-button
                    id="move-before"
                    title="Move card before"
                    icon="hass:arrow-left"
                    .disabled=${selected === 0}
                    @click=${this._handleMove}
                  ></ha-icon-button>

                  <ha-icon-button
                    id="move-after"
                    title="Move card after"
                    icon="hass:arrow-right"
                    .disabled=${selected === numcards - 1}
                    @click=${this._handleMove}
                  ></ha-icon-button>

                  <ha-icon-button
                    icon="hass:delete"
                    @click=${this._handleDeleteCard}
                  ></ha-icon-button>
                </div>

                <hui-card-editor
                  .hass=${this.hass}
                  .value=${this._config.cards[selected]}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._handleConfigChanged}
                  @GUImode-changed=${this._handleGUIModeChanged}
                ></hui-card-editor>
              `
            : html`
                <hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  @config-changed="${this._handleCardPicked}"
                ></hui-card-picker>
              `}
        </div>
      </div>
    `;
  }

  private _handleSelectedCard(ev) {
    if (ev.target.id === "add-card") {
      this._selectedCard = this._config!.cards.length;
      return;
    }
    this._setMode(true);
    this._guiModeAvailable = true;
    this._selectedCard = parseInt(ev.detail.selected, 10);
  }

  private _handleConfigChanged(ev: HASSDomEvent<ConfigChangedEvent>) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const cards = [...this._config.cards];
    cards[this._selectedCard] = ev.detail.config;
    this._config = { ...this._config, cards };
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleCardPicked(ev) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const config = ev.detail.config;
    const cards = [...this._config.cards, config];
    this._config = { ...this._config, cards };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleDeleteCard() {
    if (!this._config) {
      return;
    }
    const cards = [...this._config.cards];
    cards.splice(this._selectedCard, 1);
    this._config = { ...this._config, cards };
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleMove(ev) {
    if (!this._config) {
      return;
    }
    const source = this._selectedCard;
    const target = ev.target.id === "move-before" ? source - 1 : source + 1;
    const cards = [...this._config.cards];
    const card = cards.splice(this._selectedCard, 1)[0];
    cards.splice(target, 0, card);
    this._config = {
      ...this._config,
      cards,
    };
    this._selectedCard = target;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _setMode(value: boolean): void {
    this._GUImode = value;
    if (this._cardEditorEl) {
      this._cardEditorEl!.GUImode = value;
    }
  }

  static get styles(): CSSResult {
    return css`
      .toolbar {
        display: flex;
        --paper-tabs-selection-bar-color: var(--primary-color);
        --paper-tab-ink: var(--primary-color);
      }
      paper-tabs {
        display: flex;
        font-size: 14px;
        flex-grow: 1;
      }
      #add-card {
        max-width: 32px;
        padding: 0;
      }

      #card-options {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }

      #editor {
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
      @media (max-width: 450px) {
        #editor {
          margin: 0 -12px;
        }
      }

      .gui-mode-button {
        margin-right: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-card-editor": HuiStackCardEditor;
  }
}
