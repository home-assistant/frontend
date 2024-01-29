import { mdiFolderUpload } from "@mdi/js";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-circular-progress";
import "../../../src/components/ha-file-upload";
import { HassioBackup, uploadBackup } from "../../../src/data/hassio/backup";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../src/types";

declare global {
  interface HASSDomEvents {
    "backup-uploaded": { backup: HassioBackup };
  }
}

@customElement("hassio-upload-backup")
export class HassioUploadBackup extends LitElement {
  public hass?: HomeAssistant;

  @state() public value: string | null = null;

  @state() private _uploading = false;

  public render(): TemplateResult {
    return html`
      <ha-file-upload
        .hass=${this.hass}
        .uploading=${this._uploading}
        .icon=${mdiFolderUpload}
        accept="application/x-tar"
        label="Upload backup"
        supports="Supports .TAR files"
        @file-picked=${this._uploadFile}
      ></ha-file-upload>
    `;
  }

  private async _uploadFile(ev) {
    const file = ev.detail.files[0];

    if (!["application/x-tar"].includes(file.type)) {
      showAlertDialog(this, {
        title: "Unsupported file format",
        text: "Please choose a Home Assistant backup file (.tar)",
        confirmText: "ok",
      });
      return;
    }
    this._uploading = true;
    try {
      const backup = await uploadBackup(this.hass, file);
      fireEvent(this, "backup-uploaded", { backup: backup.data });
    } catch (err: any) {
      showAlertDialog(this, {
        title: "Upload failed",
        text: extractApiErrorMessage(err),
        confirmText: "ok",
      });
    } finally {
      this._uploading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-upload-backup": HassioUploadBackup;
  }
}
