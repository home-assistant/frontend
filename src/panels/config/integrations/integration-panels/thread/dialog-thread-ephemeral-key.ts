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

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const key = this.params.ephemeralKey;

    return html`<ha-dialog
      open
      width="small"
      header-title=${this._i18n.localize(
        "ui.panel.config.thread.share_credentials"
      )}
    >
      <div class="content">
        <p>
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
            { minutes: Math.max(1, Math.round(this.params.lifetime / 60)) }
          )}
        </p>
      </div>
    </ha-dialog>`;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.params) {
      OTBRDeleteEphemeralKey(this._api, this.params.extendedAddress).catch(
        () => {
          // The key may already be expired or the router unreachable
        }
      );
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
