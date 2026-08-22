import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";
import {
  apiContext,
  internationalizationContext,
} from "../../../../../data/context";
import { OTBRDeleteEphemeralKey } from "../../../../../data/otbr";
import { DialogMixin } from "../../../../../dialogs/dialog-mixin";
import type { DialogThreadEphemeralKeyParams } from "./show-dialog-thread-ephemeral-key";

@customElement("ha-dialog-thread-ephemeral-key")
class DialogThreadEphemeralKey extends DialogMixin<DialogThreadEphemeralKeyParams>(
  LitElement
) {
  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _secondsRemaining?: number;

  private _interval?: number;

  connectedCallback() {
    super.connectedCallback();
    this._startCountdown();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCountdown();
    // Revoke the code so it cannot be used after the dialog is gone. The key
    // is passed along so a code handed out later is left alone.
    if (this.params && this._secondsRemaining !== 0) {
      OTBRDeleteEphemeralKey(
        this._api,
        this.params.extendedAddress,
        this.params.ephemeralKey
      ).catch(() => {
        // The key may already be expired or the router unreachable
      });
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const key = this.params.ephemeralKey;
    const expired = this._secondsRemaining === 0;

    return html`<ha-dialog
      open
      width="small"
      prevent-scrim-close
      header-title=${this._i18n.localize(
        "ui.panel.config.thread.share_credentials"
      )}
    >
      <div class="content">
        ${
          expired
            ? html`<p class="expiry">
                ${this._i18n.localize(
                  "ui.panel.config.thread.share_credentials_expired"
                )}
              </p>`
            : html`<p>
                  ${this._i18n.localize(
                    "ui.panel.config.thread.share_credentials_text"
                  )}
                </p>
                <p class="code">${key.replace(/(\d{3})(?=\d)/g, "$1 ")}</p>
                <ha-qr-code
                  .data=${key}
                  error-correction-level="quartile"
                  .scale=${6}
                ></ha-qr-code>
                <p class="expiry">
                  ${this._i18n.localize(
                    "ui.panel.config.thread.share_credentials_expiry",
                    { time: this._formatRemaining(this._secondsRemaining ?? 0) }
                  )}
                </p>`
        }
      </div>
    </ha-dialog>`;
  }

  private _formatRemaining(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  private _startCountdown(): void {
    this._stopCountdown();
    if (!this.params) {
      return;
    }
    const expiresAt = Date.now() + this.params.lifetime * 1000;
    const tick = () => {
      this._secondsRemaining = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000)
      );
      if (this._secondsRemaining === 0) {
        this._stopCountdown();
      }
    };
    tick();
    this._interval = window.setInterval(tick, 1000);
  }

  private _stopCountdown(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
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
