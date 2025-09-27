import { mdiCodeBraces, mdiListBoxOutline } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import type { HomeAssistant } from "../../../types";
import "./entity-row-editor/hui-row-element-editor";
import "./feature-editor/hui-card-feature-element-editor";
import "./header-footer-editor/hui-header-footer-element-editor";
import "./heading-badge-editor/hui-heading-badge-element-editor";
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

  @property({ attribute: false }) public schema?;

  @state() private _guiModeAvailable = true;

  @state() private _guiMode = true;

  @query(".editor") private _editorElement?: HuiElementEditor;

  protected render(): TemplateResult {
    const elementType =
      this.config.elementConfig && "type" in this.config.elementConfig
        ? this.config.elementConfig.type
        : "";

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
                        `ui.panel.lovelace.editor.card.picture-elements.element_types.${elementType}`
                      ) || elementType,
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
            .context=${this.config.context}
            .schema=${this.schema}
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
            .context=${this.config.context}
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
            .context=${this.config.context}
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
            .context=${this.config.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-card-feature-element-editor>
        `;
      case "heading-badge":
        return html`
          <hui-heading-badge-element-editor
            class="editor"
            .hass=${this.hass}
            .value=${this.config.elementConfig}
            .context=${this.config.context}
            @config-changed=${this._handleConfigChanged}
            @GUImode-changed=${this._handleGUIModeChanged}
          ></hui-heading-badge-element-editor>
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

  static styles = css`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .back-title {
      display: flex;
      align-items: center;
      font-size: var(--ha-font-size-l);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sub-element-editor": HuiSubElementEditor;
  }
}
