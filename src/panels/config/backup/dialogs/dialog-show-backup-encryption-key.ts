import { mdiClose, mdiContentCopy, mdiDownload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { copyToClipboard } from "../../../../common/util/copy-clipboard";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-icon-button-prev";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
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

  @state() private _params?: ShowBackupEncryptionKeyDialogParams;

  @query("ha-md-dialog") private _dialog!: HaMdDialog;

  public showDialog(params: ShowBackupEncryptionKeyDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  private _closeDialog() {
    this._dialog.close();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-md-dialog disable-cancel-action open @closed=${this.closeDialog}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            @click=${this._closeDialog}
          ></ha-icon-button>
          <span slot="title">
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.show_encryption_key.title"
            )}
          </span>
        </ha-dialog-header>
        <div slot="content">
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
              <ha-button
                size="small"
                appearance="plain"
                slot="end"
                @click=${this._download}
              >
                <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_emergency_kit_action"
                )}
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div slot="actions">
          <ha-button @click=${this._closeDialog}>
            ${this.hass.localize("ui.common.close")}
          </ha-button>
        </div>
      </ha-md-dialog>
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
        ha-md-dialog {
          width: 90vw;
          max-width: 560px;
          --dialog-content-padding: 8px 24px;
        }
        ha-md-list {
          background: none;
          --md-list-item-leading-space: 0;
          --md-list-item-trailing-space: 0;
        }
        .encryption-key {
          border: 1px solid var(--divider-color);
          background-color: var(--primary-background-color);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 24px;
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
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-md-dialog {
            max-width: none;
          }
          div[slot="content"] {
            margin-top: 0;
          }
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
