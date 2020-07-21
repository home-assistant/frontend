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
import "../../../../components/entity/ha-entity-picker";
import { LovelaceConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { ConditionalCardConfig } from "../../cards/types";
import { LovelaceCardEditor } from "../../types";
import {
  ConfigChangedEvent,
  HuiCardEditor,
} from "../card-editor/hui-card-editor";
import "../card-editor/hui-card-picker";
import { GUIModeChangedEvent } from "../types";
import { string, any, object, optional, array, assert } from "superstruct";

const conditionStruct = object({
  entity: string(),
  state: optional(string()),
  state_not: optional(string()),
});
const cardConfigStruct = object({
  type: string(),
  card: any(),
  conditions: optional(array(conditionStruct)),
});

@customElement("hui-conditional-card-editor")
export class HuiConditionalCardEditor extends LitElement
  implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @internalProperty() private _config?: ConditionalCardConfig;

  @internalProperty() private _GUImode = true;

  @internalProperty() private _guiModeAvailable? = true;

  @internalProperty() private _cardTab = false;

  @query("hui-card-editor") private _cardEditorEl?: HuiCardEditor;

  public setConfig(config: ConditionalCardConfig): void {
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

    return html`
      <paper-tabs
        .selected=${this._cardTab ? "1" : "0"}
        @iron-select=${this._selectTab}
      >
        <paper-tab
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.card.conditional.conditions"
          )}</paper-tab
        >
        <paper-tab
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.card.conditional.card"
          )}</paper-tab
        >
      </paper-tabs>
      ${this._cardTab
        ? html`
            <div class="card">
              ${this._config.card.type !== undefined
                ? html`
                    <div class="card-options">
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
                      <mwc-button @click=${this._handleReplaceCard}
                        >${this.hass!.localize(
                          "ui.panel.lovelace.editor.card.conditional.change_type"
                        )}</mwc-button
                      >
                    </div>
                    <hui-card-editor
                      .hass=${this.hass}
                      .value=${this._config.card}
                      .lovelace=${this.lovelace}
                      @config-changed=${this._handleCardChanged}
                      @GUImode-changed=${this._handleGUIModeChanged}
                    ></hui-card-editor>
                  `
                : html`
                    <hui-card-picker
                      .hass=${this.hass}
                      .lovelace=${this.lovelace}
                      @config-changed=${this._handleCardPicked}
                    ></hui-card-picker>
                  `}
            </div>
          `
        : html`
            <div class="conditions">
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.card.conditional.condition_explanation"
              )}
              ${this._config.conditions.map((cond, idx) => {
                return html`
                  <div class="condition">
                    <div class="entity">
                      <ha-entity-picker
                        .hass=${this.hass}
                        .value=${cond.entity}
                        .index=${idx}
                        .configValue=${"entity"}
                        @change=${this._changeCondition}
                        allow-custom-entity
                      ></ha-entity-picker>
                    </div>
                    <div class="state">
                      <paper-dropdown-menu>
                        <paper-listbox
                          .selected=${cond.state_not !== undefined ? 1 : 0}
                          slot="dropdown-content"
                          .index=${idx}
                          .configValue=${"invert"}
                          @selected-item-changed=${this._changeCondition}
                        >
                          <paper-item
                            >${this.hass!.localize(
                              "ui.panel.lovelace.editor.card.conditional.state_equal"
                            )}</paper-item
                          >
                          <paper-item
                            >${this.hass!.localize(
                              "ui.panel.lovelace.editor.card.conditional.state_not_equal"
                            )}</paper-item
                          >
                        </paper-listbox>
                      </paper-dropdown-menu>
                      <paper-input
                        .label="${this.hass!.localize(
                          "ui.panel.lovelace.editor.card.generic.state"
                        )} (${this.hass!.localize(
                          "ui.panel.lovelace.editor.card.conditional.current_state"
                        )}: '${this.hass?.states[cond.entity].state}')"
                        .value=${cond.state_not !== undefined
                          ? cond.state_not
                          : cond.state}
                        .index=${idx}
                        .configValue=${"state"}
                        @value-changed=${this._changeCondition}
                      ></paper-input>
                    </div>
                  </div>
                `;
              })}
              <div class="condition">
                <ha-entity-picker
                  .hass=${this.hass}
                  @change=${this._addCondition}
                ></ha-entity-picker>
              </div>
            </div>
          `}
    `;
  }

  private _selectTab(ev: Event): void {
    this._cardTab = parseInt((ev.target! as any).selected!, 10) === 1;
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  private _setMode(value: boolean): void {
    this._GUImode = value;
    if (this._cardEditorEl) {
      this._cardEditorEl.GUImode = value;
    }
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._GUImode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _handleCardPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    this._setMode(true);
    this._guiModeAvailable = true;
    this._config = { ...this._config, card: ev.detail.config };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleCardChanged(ev: HASSDomEvent<ConfigChangedEvent>): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    this._config = { ...this._config, card: ev.detail.config };
    this._guiModeAvailable = ev.detail.guiModeAvailable;
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleReplaceCard(): void {
    if (!this._config) {
      return;
    }
    // @ts-ignore
    this._config = { ...this._config, card: {} };
    // @ts-ignore
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _addCondition(ev: Event): void {
    const target = ev.target! as any;
    if (target.value === "" || !this._config) {
      return;
    }
    const conditions = [...this._config.conditions];
    conditions.push({
      entity: target.value,
      state: "",
    });
    this._config = { ...this._config, conditions };
    target.value = "";
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _changeCondition(ev: Event): void {
    const target = ev.target as any;
    if (!this._config || !target) {
      return;
    }
    const conditions = [...this._config.conditions];
    if (target.configValue === "entity" && target.value === "") {
      conditions.splice(target.index, 1);
    } else {
      const condition = { ...conditions[target.index] };
      if (target.configValue === "entity") {
        condition.entity = target.value;
      } else if (target.configValue === "state") {
        if (condition.state_not !== undefined) {
          condition.state_not = target.value;
        } else {
          condition.state = target.value;
        }
      } else if (target.configValue === "invert") {
        if (target.selected === 1) {
          if (condition.state) {
            condition.state_not = condition.state;
            delete condition.state;
          }
        } else if (condition.state_not) {
          condition.state = condition.state_not;
          delete condition.state_not;
        }
      }
      conditions[target.index] = condition;
    }
    this._config = { ...this._config, conditions };
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResult {
    return css`
      paper-tabs {
        --paper-tabs-selection-bar-color: var(--primary-color);
        --paper-tab-ink: var(--primary-color);
        border-bottom: 1px solid var(--divider-color);
      }
      .conditions {
        margin-top: 8px;
      }
      .condition {
        margin-top: 8px;
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
      .condition .state {
        display: flex;
        align-items: flex-end;
      }
      .condition .state paper-dropdown-menu {
        margin-right: 16px;
      }
      .condition .state paper-input {
        flex-grow: 1;
      }

      .card {
        margin-top: 8px;
        border: 1px solid var(--divider-color);
        padding: 12px;
      }
      @media (max-width: 450px) {
        .card,
        .condition {
          margin: 8px -12px 0;
        }
      }
      .card .card-options {
        display: flex;
        justify-content: flex-end;
        width: 100%;
      }
      .gui-mode-button {
        margin-right: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card-editor": HuiConditionalCardEditor;
  }
}
