import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import "../../components/ha-svg-icon";
import "../../components/ha-switch";
import { RecurrenceRange } from "../../data/calendar";
import { HomeAssistant } from "../../types";
import { ConfirmEventDialogBoxParams } from "./show-confirm-event-dialog-box";

@customElement("confirm-event-dialog-box")
class ConfirmEventDialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ConfirmEventDialogBoxParams;

  public async showDialog(params: ConfirmEventDialogBoxParams): Promise<void> {
    this._params = params;
  }

  public closeDialog(): boolean {
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this._dialogClosed}
        defaultAction="ignore"
        .heading=${this._params.title}
      >
        <div>
          <p>${this._params.text}</p>
        </div>
        <mwc-button @click=${this._dismiss} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        <mwc-button
          slot="primaryAction"
          @click=${this._confirm}
          dialogInitialFocus
          class="destructive"
        >
          ${this._params.confirmText}
        </mwc-button>
        ${this._params.confirmFutureText
          ? html`
              <mwc-button
                @click=${this._confirmFuture}
                class="destructive"
                slot="primaryAction"
              >
                ${this._params.confirmFutureText}
              </mwc-button>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._close();
  }

  private _confirm(): void {
    if (this._params!.confirm) {
      this._params!.confirm(RecurrenceRange.THISEVENT);
    }
    this._close();
  }

  private _confirmFuture(): void {
    if (this._params!.confirm) {
      this._params!.confirm(RecurrenceRange.THISANDFUTURE);
    }
    this._close();
  }

  private _dialogClosed(ev) {
    if (ev.detail.action === "ignore") {
      return;
    }
    this._dismiss();
  }

  private _close(): void {
    if (!this._params) {
      return;
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return css`
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
      .destructive {
        --mdc-theme-primary: var(--error-color);
      }
      ha-dialog {
        /* Place above other dialogs */
        --dialog-z-index: 104;
      }
      @media all and (min-width: 600px) {
        ha-dialog {
          --mdc-dialog-min-width: 400px;
        }
      }
      ha-textfield {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-event-dialog-box": ConfirmEventDialogBox;
  }
}
