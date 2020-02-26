import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  CSSResult,
  css,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

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
    config = cardConfigStruct(config);
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const selected = this._selectedCard!;
    const numcards = this._config.cards.length;
    const start = Math.max(0, Math.min(numcards - 5, selected - 2));
    const end = Math.min(numcards, start + 5);

    return html`
      <div class="card-config">
        <div class="toolbar">
          <div id="tabbar">
            ${Array.from(Array(end - start).keys()).map((i) => {
              const isSide =
                (i === 0 && start > 0) || (i === 4 && end < numcards);
              const num = i + start;
              const isSelected = num === selected;
              return html`
                <div
                  class="tab ${classMap({
                    active: isSelected,
                  })}"
                  @click="${() => {
                    this._selectedCard = num;
                  }}"
                >
                  ${isSide ? "..." : num + 1}
                  <mwc-ripple></mwc-ripple>
                </div>
              `;
            })}
          </div>

          <div
            id="add-card"
            class="tab ${classMap({
              active: selected === numcards,
            })}"
            @click="${() => {
              this._selectedCard = numcards;
            }}"
          >
            <ha-icon icon="hass:plus"></ha-icon>
            <mwc-ripple></mwc-ripple>
          </div>
        </div>

        <div id="editor">
          ${selected < numcards
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
              `}
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
        font-size: 20px;
        height: 64px;
        border-bottom: 1px solid var(--divider-color);
        box-sizing: border-box;
      }
      #tabbar {
        display: flex;
        font-size: 14px;
        flex-grow: 1;
      }
      #tabbar.scroll_left {
        color: green;
      }
      .tab {
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        text-align: center;
        align-items: center;
        justify-content: center;
        height: 64px;
        cursor: pointer;
      }
      .tab.active,
      #add-card.active {
        color: var(--primary-color);
        border-bottom: 2px solid var(--primary-color);
      }
      #add-card {
        padding: 0;
      }
      #card-options {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }

      #editor {
        box-shadow: var(
          --ha-card-box-shadow,
          0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12),
          0 3px 1px -2px rgba(0, 0, 0, 0.2)
        );
        padding: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-stack-card-editor": HuiAlarmPanelCardEditor;
  }
}
