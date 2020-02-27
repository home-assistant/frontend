import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import "@polymer/paper-tabs";

import { struct } from "../../common/structs/struct";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardEditor } from "../../types";
import { StackCardConfig } from "../../cards/types";
import { fireEvent } from "../../../../common/dom/fire_event";

const cardConfigStruct = struct({
  type: "string",
  cards: ["any"],
  title: "string?",
});

@customElement("hui-stack-card-editor")
export class HuiAlarmPanelCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property() public hass?: HomeAssistant;
  @property() private _config?: StackCardConfig;
  @property() private _selectedCard: number = 0;

  public setConfig(config: StackCardConfig): void {
    this._config = cardConfigStruct(config);
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
            selected="${selected}"
            scrollable
            @iron-select=${(ev) => (this._selectedCard = ev.target.selected)}
          >
            ${this._config.cards.map((_, i) => {
              return html`
                <paper-tab>
                  ${i + 1}
                </paper-tab>
              `;
            })}
          </paper-tabs>
          <paper-tabs
            id="add-card"
            selected=${selected === numcards ? "0" : undefined}
          >
            <paper-tab
              @click="${() => (this._selectedCard = numcards)}"
            >
              <ha-icon icon="hass:plus"></ha-icon>
            </paper-tab>
          <paper-tabs>
        </div>

        <div id="editor">
          ${
            selected < numcards
              ? html`
                  <div id="card-options">
                    <paper-icon-button
                      title="Move card before"
                      icon="hass:arrow-left"
                      ?disabled=${selected === 0}
                      @click=${this._handleMoveBefore}
                    ></paper-icon-button>

                    <paper-icon-button
                      title="Move card after"
                      icon="hass:arrow-right"
                      ?disabled=${selected === numcards - 1}
                      @click=${this._handleMoveAfter}
                    ></paper-icon-button>

                    <paper-icon-button
                      icon="hass:delete"
                      @click=${this._handleDeleteCard}
                    ></paper-icon-button>
                  </div>

                  <hui-card-editor
                    .hass=${this.hass}
                    .value="${this._config.cards[selected]}"
                    @config-changed="${this._handleConfigChanged}"
                  ></hui-card-editor>
                `
              : html`
                  <hui-card-picker
                    .hass="${this.hass}"
                    @config-changed="${this._handleCardPicked}"
                  ></hui-card-picker>
                `
          }
        </div>
      </div>
    `;
  }

  private _handleConfigChanged(ev) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    this._config.cards[this._selectedCard] = ev.detail.config;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleCardPicked(ev) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const config = ev.detail.config;
    this._config.cards.push(config);
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleDeleteCard() {
    if (!this._config) {
      return;
    }
    this._config.cards.splice(this._selectedCard, 1);
    this._selectedCard = Math.max(0, this._selectedCard - 1);
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleMoveBefore() {
    if (!this._config) {
      return;
    }
    const tmp = this._config.cards[this._selectedCard - 1];
    this._config.cards[this._selectedCard - 1] = this._config.cards[
      this._selectedCard
    ];
    this._config.cards[this._selectedCard] = tmp;
    this._selectedCard = this._selectedCard - 1;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleMoveAfter() {
    if (!this._config) {
      return;
    }
    const tmp = this._config.cards[this._selectedCard + 1];
    this._config.cards[this._selectedCard + 1] = this._config.cards[
      this._selectedCard
    ];
    this._config.cards[this._selectedCard] = tmp;
    this._selectedCard = this._selectedCard + 1;
    fireEvent(this, "config-changed", { config: this._config });
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-card-editor": HuiAlarmPanelCardEditor;
  }
}
