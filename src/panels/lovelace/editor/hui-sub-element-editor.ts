import "@material/mwc-button";
import "@material/mwc-icon-button";
import { mdiArrowLeft } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import "./entity-row-editor/hui-row-element-editor";
import type { HuiRowElementEditor } from "./entity-row-editor/hui-row-element-editor";
import type { GUIModeChangedEvent, SubElementEditorConfig } from "./types";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
    "toggle-gui-mode": undefined;
  }
}

@customElement("hui-sub-element-editor")
export class HuiSubElementEditor extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: SubElementEditorConfig;

  @internalProperty() private _guiModeAvailable = true;

  @internalProperty() private _guiMode = true;

  @query(".editor") private _editorElement?: HuiRowElementEditor;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <mwc-icon-button @click=${this._goBack}>
            <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
          </mwc-icon-button>
          <span slot="title"
            >${this.hass.localize(
              `ui.panel.lovelace.editor.detail-editor.${this.config?.type}`
            )}</span
          >
        </div>
        <mwc-button
          slot="secondaryAction"
          class="gui-mode-button"
          .disabled=${!this._guiModeAvailable}
          @click=${this._toggleMode}
        >
          ${this.hass.localize(
            this._guiMode
              ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
              : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
          )}
        </mwc-button>
      </div>
      ${this.config.type === "row"
        ? html`
            <hui-row-element-editor
              class="editor"
              .hass=${this.hass}
              .value=${this.config.elementConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
            ></hui-row-element-editor>
          `
        : ""}
    `;
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

  static get styles(): CSSResult {
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
