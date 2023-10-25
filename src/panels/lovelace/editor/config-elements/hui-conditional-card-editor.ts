import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import type { MDCTabBarActivatedEvent } from "@material/tab-bar";
import { mdiCodeBraces, mdiContentCopy, mdiListBoxOutline } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { any, array, assert, assign, object, optional } from "superstruct";
import { storage } from "../../../../common/decorators/storage";
import { HASSDomEvent, fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-svg-icon";
import type {
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import type { ConditionalCardConfig } from "../../cards/types";
import type { LovelaceCardEditor } from "../../types";
import "../card-editor/hui-card-element-editor";
import type { HuiCardElementEditor } from "../card-editor/hui-card-element-editor";
import "../card-editor/hui-card-picker";
import "../conditions/ha-card-conditions-editor";
import "../hui-element-editor";
import type { ConfigChangedEvent } from "../hui-element-editor";
import { baseLovelaceCardConfig } from "../structs/base-card-struct";
import type { GUIModeChangedEvent } from "../types";
import { configElementStyle } from "./config-elements-style";

const cardConfigStruct = assign(
  baseLovelaceCardConfig,
  object({
    card: any(),
    conditions: optional(array(any())),
  })
);

@customElement("hui-conditional-card-editor")
export class HuiConditionalCardEditor
  extends LitElement
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @storage({
    key: "lovelaceClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  @state() private _config?: ConditionalCardConfig;

  @state() private _GUImode = true;

  @state() private _guiModeAvailable? = true;

  @state() private _cardTab = false;

  @query("hui-card-element-editor")
  private _cardEditorEl?: HuiCardElementEditor;

  public setConfig(config: ConditionalCardConfig): void {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  public focusYamlEditor() {
    this._cardEditorEl?.focusYamlEditor();
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const isGuiMode = !this._cardEditorEl || this._GUImode;

    return html`
      <mwc-tab-bar
        .activeIndex=${this._cardTab ? 1 : 0}
        @MDCTabBar:activated=${this._selectTab}
      >
        <mwc-tab
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.conditional.conditions"
          )}
        ></mwc-tab>
        <mwc-tab
          .label=${this.hass!.localize(
            "ui.panel.lovelace.editor.card.conditional.card"
          )}
        ></mwc-tab>
      </mwc-tab-bar>
      ${this._cardTab
        ? html`
            <div class="card">
              ${this._config.card.type !== undefined
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
                      <ha-icon-button
                        .label=${this.hass!.localize(
                          "ui.panel.lovelace.editor.edit_card.copy"
                        )}
                        .path=${mdiContentCopy}
                        @click=${this._handleCopyCard}
                      ></ha-icon-button>
                      <mwc-button @click=${this._handleReplaceCard}
                        >${this.hass!.localize(
                          "ui.panel.lovelace.editor.card.conditional.change_type"
                        )}</mwc-button
                      >
                    </div>
                    <hui-card-element-editor
                      .hass=${this.hass}
                      .value=${this._config.card}
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
          `
        : html`
            <ha-card-conditions-editor
              .hass=${this.hass}
              .conditions=${this._config.conditions}
              @value-changed=${this._conditionChanged}
            >
            </ha-card-conditions-editor>
          `}
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

  protected _handleCopyCard() {
    if (!this._config) {
      return;
    }
    this._clipboard = deepClone(this._config.card);
  }

  private _handleCardChanged(ev: HASSDomEvent<ConfigChangedEvent>): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    this._config = {
      ...this._config,
      card: ev.detail.config as LovelaceCardConfig,
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

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const conditions = ev.detail.value;
    this._config = { ...this._config, conditions };
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles(): CSSResultGroup {
    return [
      configElementStyle,
      css`
        mwc-tab-bar {
          border-bottom: 1px solid var(--divider-color);
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-card-editor": HuiConditionalCardEditor;
  }
}
