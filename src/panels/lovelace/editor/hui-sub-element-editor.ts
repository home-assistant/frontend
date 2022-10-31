import "@material/mwc-button";
import { mdiArrowLeft } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";
import type { LovelaceRowConfig } from "../entity-rows/types";
import type { LovelaceHeaderFooterConfig } from "../header-footer/types";
import "./entity-row-editor/hui-row-element-editor";
import "./header-footer-editor/hui-header-footer-element-editor";
import type { HuiElementEditor } from "./hui-element-editor";
import "./tile-control/hui-tile-control-element-editor";
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

  @state() private _guiModeAvailable = true;

  @state() private _guiMode = true;

  @query(".editor") private _editorElement?: HuiElementEditor<
    LovelaceRowConfig | LovelaceHeaderFooterConfig
  >;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button
            .label=${this.hass!.localize("ui.common.back")}
            .path=${mdiArrowLeft}
            @click=${this._goBack}
          ></ha-icon-button>
          <span slot="title"
            >${this.hass.localize(
              `ui.panel.lovelace.editor.sub-element-editor.types.${this.config?.type}`
            )}</span
          >
        </div>
        <mwc-button
          slot="secondaryAction"
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
        : this.config.type === "header" || this.config.type === "footer"
        ? html`
            <hui-headerfooter-element-editor
              class="editor"
              .hass=${this.hass}
              .value=${this.config.elementConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
            ></hui-headerfooter-element-editor>
          `
        : this.config.type === "tile-control"
        ? html`
            <hui-tile-control-element-editor
              class="editor"
              .hass=${this.hass}
              .value=${this.config.elementConfig}
              @config-changed=${this._handleConfigChanged}
              @GUImode-changed=${this._handleGUIModeChanged}
            ></hui-tile-control-element-editor>
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
