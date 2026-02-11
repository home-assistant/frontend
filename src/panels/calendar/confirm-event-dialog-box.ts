import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog-footer";
import "../../components/ha-svg-icon";
import "../../components/ha-switch";
import "../../components/ha-wa-dialog";
import { RecurrenceRange } from "../../data/calendar";
import type { HomeAssistant } from "../../types";
import type { ConfirmEventDialogBoxParams } from "./show-confirm-event-dialog-box";
import "../../components/ha-button";

@customElement("confirm-event-dialog-box")
class ConfirmEventDialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ConfirmEventDialogBoxParams;

  @state() private _open = false;

  @state()
  private _closeState?: "canceled" | "confirmed" | "confirmedFuture";

  public async showDialog(params: ConfirmEventDialogBoxParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    if (!this._open) {
      return true;
    }
    this._open = false;
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._params.title}
        width="small"
        @closed=${this._dialogClosed}
      >
        <div>
          <p>${this._params.text}</p>
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this._dismiss}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._confirm}
            autofocus
            variant="danger"
          >
            ${this._params.confirmText}
          </ha-button>
          ${this._params.confirmFutureText
            ? html`
                <ha-button
                  @click=${this._confirmFuture}
                  slot="primaryAction"
                  variant="danger"
                >
                  ${this._params.confirmFutureText}
                </ha-button>
              `
            : ""}
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _dismiss(): void {
    this._closeState = "canceled";
    this.closeDialog();
  }

  private _confirm(): void {
    this._closeState = "confirmed";
    if (this._params!.confirm) {
      this._params!.confirm(RecurrenceRange.THISEVENT);
    }
    this.closeDialog();
  }

  private _confirmFuture(): void {
    this._closeState = "confirmedFuture";
    if (this._params!.confirm) {
      this._params!.confirm(RecurrenceRange.THISANDFUTURE);
    }
    this.closeDialog();
  }

  private _dialogClosed(): void {
    if (!this._params) {
      return;
    }
    if (
      this._closeState !== "confirmed" &&
      this._closeState !== "confirmedFuture"
    ) {
      this._params.cancel?.();
    }
    this._params = undefined;
    this._open = false;
    this._closeState = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static styles = css`
    :host([inert]) {
      pointer-events: initial !important;
      cursor: initial !important;
    }
    a {
      color: var(--primary-color);
    }
    p {
      margin: 0;
      color: var(--primary-text-color);
    }
    .no-bottom-padding {
      padding-bottom: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
    }
    ha-wa-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
    }
    ha-textfield {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-event-dialog-box": ConfirmEventDialogBox;
  }
}
