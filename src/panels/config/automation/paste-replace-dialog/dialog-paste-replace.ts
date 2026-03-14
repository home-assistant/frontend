import { css, type CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-yaml-editor";

import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { PasteReplaceDialogParams } from "./show-dialog-paste-replace";

@customElement("ha-dialog-paste-replace")
class DialogPasteReplace extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params!: PasteReplaceDialogParams;

  public showDialog(params: PasteReplaceDialogParams): void {
    this._open = true;
    this._params = params;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed() {
    this._params = undefined!;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        @closed=${this._dialogClosed}
        header-title=${this.hass.localize(
          `ui.panel.config.${this._params.domain}.editor.paste_confirm.title`
        )}
      >
        <p>
          ${this.hass.localize(
            `ui.panel.config.${this._params.domain}.editor.paste_confirm.text`
          )}
        </p>

        <ha-yaml-editor
          .hass=${this.hass}
          .defaultValue=${this._params?.pastedConfig}
          read-only
        ></ha-yaml-editor>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._handleAppend}
          >
            ${this.hass.localize("ui.common.append")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._handleReplace}>
            ${this.hass.localize("ui.common.replace")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _handleReplace() {
    this._params?.onReplace();
    this.closeDialog();
  }

  private _handleAppend() {
    this._params?.onAppend();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        h3 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-paste-replace": DialogPasteReplace;
  }
}
