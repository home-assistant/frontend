import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HomeAssistant } from "../../../../../types";
import type { DialogThreadEphemeralKeyParams } from "./show-dialog-thread-ephemeral-key";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";

@customElement("ha-dialog-thread-ephemeral-key")
class DialogThreadEphemeralKey extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DialogThreadEphemeralKeyParams;

  @state() private _open = false;

  public async showDialog(
    params: DialogThreadEphemeralKeyParams
  ): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const key = this._params.ephemeralKey;

    return html`<ha-dialog
      .open=${this._open}
      header-title="Share network credentials"
      @closed=${this._dialogClosed}
    >
      <div class="content">
        <p>
          To add a border router to your Thread network, scan this QR code or
          enter the code below in its app.
        </p>
        <p class="code">${key.replace(/(\d{3})(?=\d)/g, "$1 ")}</p>
        <ha-qr-code
          .data=${key}
          error-correction-level="quartile"
          .scale=${6}
        ></ha-qr-code>
        <p class="expiry">
          This code expires in ${Math.floor(this._params.lifetime / 60)} minutes
          and can only be used once.
        </p>
      </div>
    </ha-dialog>`;
  }

  static styles = css`
    .content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .code {
      font-family: var(--ha-font-family-code, monospace);
      font-size: 2em;
      font-weight: 500;
      letter-spacing: 0.05em;
      margin: 8px 0 16px 0;
      user-select: all;
    }
    .expiry {
      color: var(--secondary-text-color);
      font-size: 14px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-thread-ephemeral-key": DialogThreadEphemeralKey;
  }
}
