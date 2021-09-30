import "@material/mwc-icon-button/mwc-icon-button";
import { mdiFolderUpload } from "@mdi/js";
import "@polymer/paper-input/paper-input-container";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-circular-progress";
import "../../../src/components/ha-file-upload";
import "../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { HassioBackup, uploadBackup } from "../../../src/data/hassio/backup";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../src/types";

declare global {
  interface HASSDomEvents {
    "backup-uploaded": { backup: HassioBackup };
  }
}

const MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024; // 1GB

@customElement("hassio-upload-backup")
export class HassioUploadBackup extends LitElement {
  public hass!: HomeAssistant;

  @state() public value: string | null = null;

  @state() private _uploading = false;

  public render(): TemplateResult {
    return html`
      <ha-file-upload
        .uploading=${this._uploading}
        .icon=${mdiFolderUpload}
        accept="application/x-tar"
        label="Upload backup"
        @file-picked=${this._uploadFile}
        auto-open-file-dialog
      ></ha-file-upload>
    `;
  }

  private async _uploadFile(ev) {
    const file = ev.detail.files[0];

    if (file.size > MAX_FILE_SIZE) {
      showAlertDialog(this, {
        title: "Backup file is too big",
        text: html`The maximum allowed filesize is 1GB.<br />
          <a
            href="https://www.home-assistant.io/hassio/haos_common_tasks/#restoring-a-backup-on-a-new-install"
            target="_blank"
            >Have a look here on how to restore it.</a
          >`,
        confirmText: "ok",
      });
      return;
    }

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
