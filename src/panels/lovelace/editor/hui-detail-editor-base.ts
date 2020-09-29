import "@material/mwc-button";
import "@material/mwc-icon-button";
import { mdiArrowLeft } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
    "toggle-gui-mode": undefined;
  }
}

@customElement("hui-detail-editor-base")
export class HuiDetailEditorBase extends LitElement {
  public hass!: HomeAssistant;

  @property({ type: Boolean }) public guiModeAvailable? = true;

  @property({ type: Boolean }) public guiMode? = true;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <mwc-icon-button @click=${this._goBack}>
            <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
          </mwc-icon-button>
          <slot name="title"></slot>
        </div>
        <mwc-button
          slot="secondaryAction"
          class="gui-mode-button"
          .disabled=${!this.guiModeAvailable}
          @click=${this._toggleMode}
        >
          ${this.hass.localize(
            this.guiMode
              ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
              : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
          )}
        </mwc-button>
      </div>
      <slot></slot>
    `;
  }

  private _goBack(): void {
    fireEvent(this, "go-back");
  }

  private _toggleMode(): void {
    fireEvent(this, "toggle-gui-mode");
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
    "hui-detail-editor-base": HuiDetailEditorBase;
  }
}
