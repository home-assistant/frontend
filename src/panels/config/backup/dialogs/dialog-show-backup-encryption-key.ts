import { mdiClose, mdiContentCopy, mdiDownload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-password-field";
import { downloadEmergencyKit } from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import type { ShowBackupEncryptionKeyDialogParams } from "./show-dialog-show-backup-encryption-key";

@customElement("ha-dialog-show-backup-encryption-key")
class DialogShowBackupEncryptionKey extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state() private _params?: ShowBackupEncryptionKeyDialogParams;

  public showDialog(params: ShowBackupEncryptionKeyDialogParams): void {
    this._params = params;
    this._open = true;
  }

  public closeDialog() {
    if (this._open) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._open = false;
    this._params = undefined;
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
        header-title=${this.hass.localize(
          "ui.panel.config.backup.dialogs.show_encryption_key.title"
        )}
        prevent-scrim-close
        @closed=${this.closeDialog}
      >
        <ha-icon-button
          slot="headerNavigationIcon"
          data-dialog="close"
          .label=${this.hass.localize("ui.common.close")}
          .path=${mdiClose}
        ></ha-icon-button>
        <p>
          ${this.hass.localize(
            "ui.panel.config.backup.dialogs.show_encryption_key.description"
          )}
        </p>
        <div class="encryption-key">
          <p>${this._params?.currentKey}</p>
          <ha-icon-button
            .path=${mdiContentCopy}
            @click=${this._copyKeyToClipboard}
          ></ha-icon-button>
        </div>
        <ha-md-list>
          <ha-md-list-item>
            <span slot="headline">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit"
              )}
            </span>
            <span slot="supporting-text">
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit_description"
              )}
            </span>
            <ha-button slot="end" @click=${this._download}>
              <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.backup.encryption_key.download_emergency_kit_action"
              )}
            </ha-button>
          </ha-md-list-item>
        </ha-md-list>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private async _copyKeyToClipboard() {
    if (!this._params?.currentKey) {
      return;
    }
    await copyToClipboard(
      this._params?.currentKey,
      this.renderRoot.querySelector("div")!
    );
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _download() {
    if (!this._params?.currentKey) {
      return;
    }
    downloadEmergencyKit(this.hass, this._params.currentKey, "old");
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: var(--ha-space-2) var(--ha-space-6);
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        .encryption-key {
          border: 1px solid var(--divider-color);
          background-color: var(--primary-background-color);
          border-radius: var(--ha-border-radius-md);
          padding: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--ha-space-6);
        }
        .encryption-key p {
          margin: 0;
          flex: 1;
          font-size: var(--ha-font-size-xl);
          font-family: var(--ha-font-family-code);
          font-style: normal;
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          text-align: center;
        }
        .encryption-key ha-icon-button {
          flex: none;
          margin: -16px;
        }

        p {
          margin-top: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-show-backup-encryption-key": DialogShowBackupEncryptionKey;
  }
}
