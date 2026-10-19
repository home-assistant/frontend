import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./error-log-card";
import type { LogsDialogParams } from "./show-dialog-logs";

@customElement("dialog-logs")
class LogsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: LogsDialogParams;

  @state() private _open = false;

  public showDialog(dialogParams: LogsDialogParams) {
    this._dialogParams = dialogParams;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this._dialogParams.title}
        width="large"
        @closed=${this._dialogClosed}
      >
        <error-log-card
          .hass=${this.hass}
          .header=${this._dialogParams.title}
          .provider=${this._dialogParams.provider}
        ></error-log-card>
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        error-log-card {
          --error-log-card-height: calc(100vh - 280px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-logs": LogsDialog;
  }
}
