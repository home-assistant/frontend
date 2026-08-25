import { consume, type ContextType } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import "../../../../../components/animation/ha-fade-in";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-dialog";
import "../../../../../components/ha-qr-code";
import "../../../../../components/ha-spinner";
import {
  apiContext,
  internationalizationContext,
} from "../../../../../data/context";
import type { OTBREphemeralKey } from "../../../../../data/otbr";
import {
  OTBRCreateEphemeralKey,
  OTBRDeleteEphemeralKey,
} from "../../../../../data/otbr";
import { DialogMixin } from "../../../../../dialogs/dialog-mixin";
import type { DialogThreadEphemeralKeyParams } from "./show-dialog-thread-ephemeral-key";

const ERROR_TEXTS: Record<string, LocalizeKeys> = {
  ephemeral_key_not_supported:
    "ui.panel.config.thread.share_credentials_not_supported",
  ephemeral_key_in_use: "ui.panel.config.thread.share_credentials_in_use",
};

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

  @state() private _key?: OTBREphemeralKey;

  @state() private _error?: string;

  @state() private _secondsRemaining?: number;

  private _extendedAddress?: string;

  private _interval?: number;

  connectedCallback() {
    super.connectedCallback();
    if (this.params) {
      this._createKey();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCountdown();
    // Revoke the code so it cannot be used after the dialog is gone
    if (this._key && this._secondsRemaining !== 0) {
      this._revoke(this._key.ephemeral_key);
    }
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }

    return html`<ha-dialog
      open
      width="small"
      prevent-scrim-close
      header-title=${this._i18n.localize(
        "ui.panel.config.thread.share_credentials"
      )}
    >
      <div class="content">${this._renderContent()}</div>
    </ha-dialog>`;
  }

  private _renderContent() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._key) {
      return html`<ha-fade-in .delay=${500}
        ><ha-spinner size="large"></ha-spinner
      ></ha-fade-in>`;
    }
    if (this._secondsRemaining === 0) {
      return html`<p class="expiry">
        ${this._i18n.localize(
          "ui.panel.config.thread.share_credentials_expired"
        )}
      </p>`;
    }

    const key = this._key.ephemeral_key;
    return html`<p>
        ${this._i18n.localize("ui.panel.config.thread.share_credentials_text")}
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
      </p>`;
  }

  private async _createKey(): Promise<void> {
    // Remember which router the key belongs to; the dialog manager can swap
    // params without creating a new dialog
    this._extendedAddress = this.params!.extendedAddress;
    try {
      const key = await OTBRCreateEphemeralKey(
        this._api,
        this._extendedAddress
      );
      if (!this.isConnected) {
        // Closed while the code was being created, don't leave it active
        this._revoke(key.ephemeral_key);
        return;
      }
      this._key = key;
      this._startCountdown();
    } catch (err: any) {
      this._error = ERROR_TEXTS[err.code]
        ? this._i18n.localize(ERROR_TEXTS[err.code])
        : err.message ||
          this._i18n.localize(
            "ui.panel.config.thread.share_credentials_failed"
          );
    }
  }

  private _revoke(ephemeralKey: string): void {
    OTBRDeleteEphemeralKey(
      this._api,
      this._extendedAddress!,
      ephemeralKey
    ).catch(() => {
      // The key may already be expired or the router unreachable
    });
  }

  private _formatRemaining(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  private _startCountdown(): void {
    this._stopCountdown();
    if (!this._key) {
      return;
    }
    const expiresAt = Date.now() + this._key.lifetime * 1000;
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
      justify-content: center;
      text-align: center;
      min-height: 300px;
    }
    ha-alert {
      align-self: stretch;
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
