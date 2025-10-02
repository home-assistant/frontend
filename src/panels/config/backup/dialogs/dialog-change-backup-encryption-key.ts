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
import {
  downloadEmergencyKit,
  generateEncryptionKey,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";
import type { ChangeBackupEncryptionKeyDialogParams } from "./show-dialog-change-backup-encryption-key";

const STEPS = ["current", "new", "done"] as const;

type Step = (typeof STEPS)[number];

@customElement("ha-dialog-change-backup-encryption-key")
class DialogChangeBackupEncryptionKey extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _step?: Step;

  @state() private _params?: ChangeBackupEncryptionKeyDialogParams;

  @query("ha-md-dialog") private _dialog!: HaMdDialog;

  @state() private _newEncryptionKey?: string;

  public showDialog(params: ChangeBackupEncryptionKeyDialogParams): void {
    this._params = params;
    this._step = STEPS[0];
    this._opened = true;
    this._newEncryptionKey = generateEncryptionKey();
  }

  public closeDialog() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._step = undefined;
    this._params = undefined;
    this._newEncryptionKey = undefined;
    return true;
  }

  private _done() {
    this._params?.submit!(true);
    this._dialog.close();
  }

  private _previousStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === 0) {
      return;
    }
    this._step = STEPS[index - 1];
  }

  private _nextStep() {
    const index = STEPS.indexOf(this._step!);
    if (index === STEPS.length - 1) {
      return;
    }
    this._step = STEPS[index + 1];
  }

  protected render() {
    if (!this._opened || !this._params) {
      return nothing;
    }

    const dialogTitle =
      this._step === "current" || this._step === "new"
        ? this.hass.localize(
            `ui.panel.config.backup.dialogs.change_encryption_key.${this._step}.title`
          )
        : "";

    return html`
      <ha-md-dialog disable-cancel-action open @closed=${this.closeDialog}>
        <ha-dialog-header slot="headline">
          ${this._step === "new"
            ? html`
                <ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._previousStep}
                ></ha-icon-button-prev>
              `
            : html`
                <ha-icon-button
                  slot="navigationIcon"
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                  @click=${this.closeDialog}
                ></ha-icon-button>
              `}
          <span slot="title">${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content">${this._renderStepContent()}</div>
        <div slot="actions">
          ${this._step === "current"
            ? html`
                <ha-button @click=${this._nextStep}>
                  ${this.hass.localize("ui.common.next")}
                </ha-button>
              `
            : this._step === "new"
              ? html`
                  <ha-button
                    @click=${this._submit}
                    .disabled=${!this._newEncryptionKey}
                    variant="danger"
                  >
                    ${this.hass.localize(
                      "ui.panel.config.backup.dialogs.change_encryption_key.actions.change"
                    )}
                  </ha-button>
                `
              : html`
                  <ha-button @click=${this._done}>
                    ${this.hass.localize(
                      "ui.panel.config.backup.dialogs.change_encryption_key.actions.done"
                    )}
                  </ha-button>
                `}
        </div>
      </ha-md-dialog>
    `;
  }

  private _renderStepContent() {
    switch (this._step) {
      case "current":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.change_encryption_key.current.description"
            )}
          </p>
          <div class="encryption-key">
            <p>${this._params?.currentKey}</p>
            <ha-icon-button
              .path=${mdiContentCopy}
              @click=${this._copyOldKeyToClipboard}
            ></ha-icon-button>
          </div>
          <ha-md-list>
            <ha-md-list-item>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_old_emergency_kit"
                )}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_old_emergency_kit_description"
                )}
              </span>
              <ha-button slot="end" @click=${this._downloadOld}>
                <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_old_emergency_kit_action"
                )}
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "new":
        return html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.backup.dialogs.change_encryption_key.new.description"
            )}
          </p>
          <div class="encryption-key">
            <p>${this._newEncryptionKey}</p>
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
              <ha-button slot="end" @click=${this._downloadNew}>
                <ha-svg-icon .path=${mdiDownload} slot="start"></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.backup.encryption_key.download_emergency_kit_action"
                )}
              </ha-button>
            </ha-md-list-item>
          </ha-md-list>
        `;
      case "done":
        return html`
          <div class="done">
            <img
              src="/static/images/voice-assistant/hi.png"
              alt="Casita Home Assistant logo"
            />
            <h1>
              ${this.hass.localize(
                "ui.panel.config.backup.dialogs.change_encryption_key.done.title"
              )}
            </h1>
          </div>
        `;
    }
    return nothing;
  }

  private async _copyKeyToClipboard() {
    await copyToClipboard(
      this._newEncryptionKey,
      this.renderRoot.querySelector("div")!
    );
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private async _copyOldKeyToClipboard() {
    if (!this._params?.currentKey) {
      return;
    }
    await copyToClipboard(
      this._params.currentKey,
      this.renderRoot.querySelector("div")!
    );
    showToast(this, {
      message: this.hass.localize("ui.common.copied_clipboard"),
    });
  }

  private _downloadOld() {
    if (!this._params?.currentKey) {
      return;
    }
    downloadEmergencyKit(this.hass, this._params.currentKey, "old");
  }

  private _downloadNew() {
    if (!this._newEncryptionKey) {
      return;
    }
    downloadEmergencyKit(this.hass, this._newEncryptionKey);
  }

  private async _submit() {
    if (!this._newEncryptionKey) {
      return;
    }
    this._params!.saveKey(this._newEncryptionKey);
    this._nextStep();
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
        .done {
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-change-backup-encryption-key": DialogChangeBackupEncryptionKey;
  }
}
