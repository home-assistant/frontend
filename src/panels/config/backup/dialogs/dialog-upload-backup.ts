import { mdiClose, mdiFolderUpload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-file-upload";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import {
  CORE_LOCAL_AGENT,
  HASSIO_LOCAL_AGENT,
  uploadBackup,
} from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showAlertDialog } from "../../../lovelace/custom-card-helpers";
import "../components/ha-backup-agents-picker";
import type { UploadBackupDialogParams } from "./show-dialog-upload-backup";

const SUPPORTED_FORMAT = "application/x-tar";

type FormData = {
  file?: File;
};

const INITIAL_DATA: FormData = {
  file: undefined,
};

@customElement("ha-dialog-upload-backup")
export class DialogUploadBackup
  extends LitElement
  implements HassDialog<UploadBackupDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: UploadBackupDialogParams;

  @state() private _uploading = false;

  @state() private _error?: string;

  @state() private _formData?: FormData;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(params: UploadBackupDialogParams): Promise<void> {
    this._params = params;
    this._formData = INITIAL_DATA;
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._formData = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog() {
    this._dialog?.close();
  }

  private _formValid() {
    return this._formData?.file !== undefined;
  }

  protected render() {
    if (!this._params || !this._formData) {
      return nothing;
    }

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>

          <span slot="title">Upload backup</span>
        </ha-dialog-header>
        <div slot="content">
          <ha-file-upload
            .hass=${this.hass}
            .uploading=${this._uploading}
            .icon=${mdiFolderUpload}
            accept=${SUPPORTED_FORMAT}
            label="Select backup file"
            supports="Supports .tar files"
            @file-picked=${this._filePicked}
          ></ha-file-upload>
          ${this._error
            ? html`<ha-alert alertType="error">${this._error}</ha-alert>`
            : nothing}
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>Cancel</ha-button>
          <ha-button @click=${this._upload} .disabled=${!this._formValid()}>
            Upload backup
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private async _filePicked(ev: CustomEvent<{ files: File[] }>): Promise<void> {
    this._error = undefined;
    const file = ev.detail.files[0];

    this._formData = {
      ...this._formData!,
      file,
    };
  }

  private async _upload() {
    const { file } = this._formData!;
    if (!file || file.type !== SUPPORTED_FORMAT) {
      showAlertDialog(this, {
        title: "Unsupported file format",
        text: "Please choose a Home Assistant backup file (.tar)",
        confirmText: "ok",
      });
      return;
    }

    const agentIds = isComponentLoaded(this.hass!, "hassio")
      ? [HASSIO_LOCAL_AGENT]
      : [CORE_LOCAL_AGENT];

    this._uploading = true;
    try {
      await uploadBackup(this.hass!, file, agentIds);
      this._params!.submit?.();
      this.closeDialog();
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._uploading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
          width: 100%;
          max-width: 500px;
          max-height: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-upload-backup": DialogUploadBackup;
  }
}
