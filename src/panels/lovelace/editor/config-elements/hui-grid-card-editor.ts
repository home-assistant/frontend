import { mdiArrowLeft, mdiArrowRight, mdiDelete, mdiPlus } from "@mdi/js";
import { customElement, html, TemplateResult } from "lit-element";
import {
  any,
  array,
  assert,
  object,
  optional,
  string,
  boolean,
  number,
} from "superstruct";
import { fireEvent } from "../../../../common/dom/fire_event";
import { GridCardConfig } from "../../cards/types";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";
import { HuiStackCardEditor } from "./hui-stack-card-editor";

const cardConfigStruct = object({
  type: string(),
  cards: array(any()),
  title: optional(string()),
  square: optional(boolean()),
  columns: optional(number()),
});

@customElement("hui-grid-card-editor")
export class HuiGridCardEditor extends HuiStackCardEditor {
  public setConfig(config: Readonly<GridCardConfig>): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const selected = this._selectedCard!;
    const numcards = this._config.cards.length;

    return html`
      <div class="card-config">
        ${this._config.type === "grid"
          ? html`
              <div class="side-by-side">
                <paper-input
                  .label="${this.hass.localize(
                    "ui.panel.lovelace.editor.card.grid.columns"
                  )} (${this.hass.localize(
                    "ui.panel.lovelace.editor.card.config.optional"
                  )})"
                  type="number"
                  .value=${(this._config as GridCardConfig).columns}
                  .configValue=${"columns"}
                  @value-changed=${this._handleColumnsChanged}
                ></paper-input>
                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.panel.lovelace.editor.card.grid.square"
                  )}
                  .dir=${computeRTLDirection(this.hass)}
                >
                  <ha-switch
                    .checked=${(this._config as GridCardConfig).square}
                    .configValue=${"square"}
                    @change=${this._handleSquareChanged}
                  ></ha-switch>
                </ha-formfield>
              </div>
            `
          : ""}
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
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
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

                  <mwc-icon-button
                    .disabled=${selected === 0}
                    .title=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_before"
                    )}
                    @click=${this._handleMove}
                    .move=${-1}
                  >
                    <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
                  </mwc-icon-button>

                  <mwc-icon-button
                    .title=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.move_after"
                    )}
                    .disabled=${selected === numcards - 1}
                    @click=${this._handleMove}
                    .move=${1}
                  >
                    <ha-svg-icon .path=${mdiArrowRight}></ha-svg-icon>
                  </mwc-icon-button>

                  <mwc-icon-button
                    .title=${this.hass!.localize(
                      "ui.panel.lovelace.editor.edit_card.delete"
                    )}
                    @click=${this._handleDeleteCard}
                  >
                    <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                  </mwc-icon-button>
                </div>

                <hui-card-element-editor
                  .hass=${this.hass}
                  .value=${this._config.cards[selected]}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._handleConfigChanged}
                  @GUImode-changed=${this._handleGUIModeChanged}
                ></hui-card-element-editor>
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

  private _handleColumnsChanged(ev): void {
    if (!this._config) {
      return;
    }

    this._config = {
      ...this._config,
      columns: Number(ev.target.value),
    };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleSquareChanged(ev): void {
    if (!this._config) {
      return;
    }

    this._config = {
      ...this._config,
      square: ev.target.checked,
    };
    fireEvent(this, "config-changed", { config: this._config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-grid-card-editor": HuiGridCardEditor;
  }
}
