import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import type { MDCTabBarActivatedEvent } from "@material/tab-bar";
import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import {
  any,
  array,
  assert,
  assign,
  boolean,
  object,
  optional,
  string,
} from "superstruct";
import { fireEvent, HASSDomEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import { LovelaceCardConfig, LovelaceConfig } from "../../../../data/lovelace";
import { HomeAssistant } from "../../../../types";
import { EntityFilterCardConfig } from "../../cards/types";
import {
  EntityFilterEntityConfig,
  LovelaceRowConfig,
} from "../../entity-rows/types";
import { LovelaceCardEditor } from "../../types";
import "../card-editor/hui-card-element-editor";
import type { HuiCardElementEditor } from "../card-editor/hui-card-element-editor";
import "../card-editor/hui-card-picker";
import "../hui-element-editor";
import type { ConfigChangedEvent } from "../hui-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import { entitiesConfigStruct } from "../structs/entities-struct";
import { EntitiesEditorEvent, GUIModeChangedEvent } from "../types";
import { configElementStyle } from "./config-elements-style";
import { processEditorEntities } from "../process-editor-entities";
import { computeRTLDirection } from "../../../../common/util/compute_rtl";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    card: optional(any()),
    entities: array(entitiesConfigStruct),
    state_filter: array(string()),
    show_empty: optional(boolean()),
  })
);

@customElement("hui-entity-filter-card-editor")
export class HuiEntityFilterCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @state() protected _config?: EntityFilterCardConfig;

  @state() private _configEntities?: LovelaceRowConfig[];

  @state() private _GUImode = true;

  @state() private _guiModeAvailable? = true;

  @state() private _cardTab = false;

  @query("hui-card-element-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  public setConfig(config: EntityFilterCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
    this._configEntities = processEditorEntities(config.entities);
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <mwc-tab-bar
        .activeIndex=${this._cardTab ? 1 : 0}
        @MDCTabBar:activated=${this._selectTab}
      >
        <mwc-tab
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.entity-filter.filters"
          )}
        ></mwc-tab>
        <mwc-tab
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.entity-filter.card"
          )}
        ></mwc-tab>
      </mwc-tab-bar>
      ${this._cardTab ? this._renderCardEditor() : this._renderFilterEditor()}
    `;
  }

  private _renderFilterEditor(): TemplateResult {
    return html`
      <div class="entities">
        <hui-entity-editor
          .hass=${this.hass}
          .entities=${this._configEntities}
          @entities-changed=${this._entitiesChanged}
        ></hui-entity-editor>
      </div>
      <div class="states">
        <h3>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.card.entity-filter.display_states"
          )}
          (${this.hass!.localize(
            "ui.panel.lovelace.editor.card.config.required"
          )})
        </h3>
        ${this._config!.state_filter.map(
          (stte, idx) => html`<div class="state">
            <paper-input
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.card.entity-filter.state"
              )}
              .value=${stte as string}
              .index=${idx}
              @change=${this._stateChanged}
            >
              <ha-icon-button
                .label=${this.hass!.localize(
                  "ui.panel.lovelace.editor.card.entity-filter.delete_state"
                )}
                .path=${mdiClose}
                tabindex="-1"
                no-ripple
                .index=${idx}
                slot="suffix"
                @click=${this._stateDeleted}
              >
              </ha-icon-button>
            </paper-input>
          </div>`
        )}
        <paper-input
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.entity-filter.state"
          )}
          @change=${this._stateAdded}
        ></paper-input>
      </div>
    `;
  }

  private _renderCardEditor(): TemplateResult {
    return html`
      <div class="card">
        <ha-formfield
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.entity-filter.show_empty"
          )}
          .dir=${computeRTLDirection(this.hass!)}
        >
          <ha-switch
            .checked=${this._config!.show_empty !== false}
            @change=${this._showEmptyToggle}
          ></ha-switch>
        </ha-formfield>
        ${this._config!.card && this._config!.card.type !== undefined
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
              <hui-card-element-editor
                .hass=${this.hass}
                .value=${this._getCardConfig()}
                .lovelace=${this.lovelace}
                @config-changed=${this._handleCardChanged}
                @GUImode-changed=${this._handleGUIModeChanged}
              ></hui-card-element-editor>
            `
          : html`
              <hui-card-picker
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                @config-changed=${this._handleCardPicked}
              ></hui-card-picker>
            `}
      </div>
    `;
  }

  private _selectTab(ev: MDCTabBarActivatedEvent): void {
    this._cardTab = ev.detail.index === 1;
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

  private _showEmptyToggle(): void {
    if (!this._config || !this.hass) {
      return;
    }
    this._config = {
      ...this._config,
      show_empty: this._config.show_empty === false,
    };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _entitiesChanged(ev: EntitiesEditorEvent): void {
    if (!this._config || !this.hass) {
      return;
    }
    if (!ev.detail || !ev.detail.entities) {
      return;
    }

    this._config = {
      ...this._config,
      entities: ev.detail.entities as EntityFilterEntityConfig[],
    };
    this._configEntities = processEditorEntities(this._config.entities);

    fireEvent(this, "config-changed", { config: this._config });
  }

  private _stateDeleted(ev: Event): void {
    const target = ev.target! as any;
    if (target.value === "" || !this._config) {
      return;
    }
    const state_filter = [...this._config.state_filter];
    state_filter.splice(target.index, 1);

    this._config = { ...this._config, state_filter };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _stateAdded(ev: Event): void {
    const target = ev.target! as any;
    if (target.value === "" || !this._config) {
      return;
    }
    const state_filter = [...this._config.state_filter];
    state_filter.push(target.value);

    this._config = { ...this._config, state_filter };
    target.value = "";
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _stateChanged(ev: Event): void {
    const target = ev.target! as any;
    if (target.value === "" || !this._config) {
      return;
    }
    const state_filter = [...this._config.state_filter];
    state_filter[target.index] = target.value;

    this._config = { ...this._config, state_filter };
    fireEvent(this, "config-changed", { config: this._config });
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
    const cardConfig = { ...ev.detail.config } as LovelaceCardConfig;
    delete cardConfig.entities;
    this._setMode(true);
    this._guiModeAvailable = true;
    this._config = { ...this._config, card: cardConfig };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleCardChanged(ev: HASSDomEvent<ConfigChangedEvent>): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const cardConfig = { ...ev.detail.config } as LovelaceCardConfig;
    delete cardConfig.entities;
    this._config = {
      ...this._config,
      card: cardConfig,
    };
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

  private _getCardConfig(): LovelaceCardConfig {
    const cardConfig = { ...this._config!.card } as LovelaceCardConfig;
    cardConfig.entities = [];
    return cardConfig;
  }

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        mwc-tab-bar {
          border-bottom: 1px solid var(--divider-color);
        }

        .entities,
        .states,
        .card {
          margin-top: 8px;
          border: 1px solid var(--divider-color);
          padding: 12px;
        }
        @media (max-width: 450px) {
          .entities,
          .states,
          .card {
            margin: 8px -12px 0;
          }
        }

        .state {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        .state paper-input {
          flex-grow: 1;
        }

        .card .card-options {
          display: flex;
          justify-content: flex-end;
          width: 100%;
        }
        .gui-mode-button {
          margin-right: auto;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-filter-card-editor": HuiEntityFilterCardEditor;
  }
}
