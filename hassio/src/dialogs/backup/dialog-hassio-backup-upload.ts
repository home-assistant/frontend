import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-header-bar";
import { HassDialog } from "../../../../src/dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-upload-backup";
import { HassioBackupUploadDialogParams } from "./show-dialog-backup-upload";

@customElement("dialog-hassio-backup-upload")
export class DialogHassioBackupUpload
  extends LitElement
  implements HassDialog<HassioBackupUploadDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: HassioBackupUploadDialogParams;

  public async showDialog(
    params: HassioBackupUploadDialogParams
  ): Promise<void> {
    this._params = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    if (this._params && !this._params.onboarding) {
      if (this._params.reloadBackup) {
        this._params.reloadBackup();
      }
    }
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${true}
        @closed=${this.closeDialog}
      >
        <div slot="heading">
          <ha-header-bar>
            <span slot="title"> Upload backup </span>
            <mwc-icon-button slot="actionItems" dialogAction="cancel">
              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
            </mwc-icon-button>
          </ha-header-bar>
        </div>
        <hassio-upload-backup
          @backup-uploaded=${this._backupUploaded}
          .hass=${this.hass}
        ></hassio-upload-backup>
      </ha-dialog>
    `;
  }

  private _backupUploaded(ev) {
    const backup = ev.detail.backup;
    this._params?.showBackup(backup.slug);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          flex-shrink: 0;
        }
        /* overrule the ha-style-dialog max-height on small screens */
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-header-bar {
            --mdc-theme-primary: var(--app-header-background-color);
            --mdc-theme-on-primary: var(--app-header-text-color, white);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-backup-upload": DialogHassioBackupUpload;
  }
}
