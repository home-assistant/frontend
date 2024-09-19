import "@material/mwc-button";
import { mdiCodeBraces, mdiListBoxOutline } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import type { HomeAssistant } from "../../../types";
import type { LovelaceRowConfig } from "../entity-rows/types";
import type { LovelaceHeaderFooterConfig } from "../header-footer/types";
import "./entity-row-editor/hui-row-element-editor";
import "./feature-editor/hui-card-feature-element-editor";
import "./header-footer-editor/hui-header-footer-element-editor";
import "./heading-entity/hui-heading-entity-element-editor";
import type { HuiElementEditor } from "./hui-element-editor";
import "./picture-element-editor/hui-picture-element-element-editor";
import type { GUIModeChangedEvent, SubElementEditorConfig } from "./types";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
  }
}

@customElement("hui-sub-element-editor")
export class HuiSubElementEditor extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: SubElementEditorConfig;

  @property({ attribute: false }) public context?: any;

  @state() private _guiModeAvailable = true;

  @state() private _guiMode = true;

  @query(".editor") private _editorElement?: HuiElementEditor<
    LovelaceRowConfig | LovelaceHeaderFooterConfig
  >;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button-prev
            .label=${this.hass!.localize("ui.common.back")}
            @click=${this._goBack}
          ></ha-icon-button-prev>
          <span slot="title">
            ${this.config?.type === "element"
              ? this.hass.localize(
                  `ui.panel.lovelace.editor.sub-element-editor.types.element_type`,
                  {
                    type:
                      this.hass.localize(
                        `ui.panel.lovelace.editor.card.picture-elements.element_types.${this.config?.elementConfig?.type}`
                      ) || this.config?.elementConfig?.type,
                  }
                )
              : this.hass.localize(
                  `ui.panel.lovelace.editor.sub-element-editor.types.${this.config?.type}`
                )}
          </span>
        </div>
        <ha-icon-button
          class="gui-mode-button"
          @click=${this._toggleMode}
          .disabled=${!this._guiModeAvailable}
          .label=${this.hass!.localize(
            this._guiMode
              ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
              : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
          )}
          .path=${this._guiMode ? mdiCodeBraces : mdiListBoxOutline}
        ></ha-icon-button>
      </div>
      ${this._renderEditor()}
    `;
  }

  private _renderEditor() {
    const type = this.config.type;
    switch (type) {
      case "row":
        return html`
          <hui-row-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-row-element-editor>
        `;
      case "header":
      case "footer":
        return html`
          <hui-headerfooter-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-headerfooter-element-editor>
        `;
      case "element":
        return html`
          <hui-picture-element-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-picture-element-element-editor>
        `;
      case "feature":
        return html`
          <hui-card-feature-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-card-feature-element-editor>
        `;
      case "heading-entity":
        return html`
          <hui-heading-entity-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-heading-entity-element-editor>
        `;
      default:
        return nothing;
    }
  }

  private _goBack(): void {
    fireEvent(this, "go-back");
  }

  private _toggleMode(): void {
    this._editorElement?.toggleMode();
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._guiMode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _handleConfigChanged(ev: CustomEvent): void {
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  static get styles(): CSSResultGroup {
    return css`
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .back-title {
        display: flex;
        align-items: center;
        font-size: 18px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sub-element-editor": HuiSubElementEditor;
  }
}
