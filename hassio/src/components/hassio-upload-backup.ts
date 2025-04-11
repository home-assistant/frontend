import { mdiFolderUpload } from "@mdi/js";
import type { TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-file-upload";
import type { HassioBackup } from "../../../src/data/hassio/backup";
import { uploadBackup } from "../../../src/data/hassio/backup";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../src/types";
import type { LocalizeFunc } from "../../../src/common/translations/localize";

declare global {
  interface HASSDomEvents {
    "hassio-backup-uploaded": { backup: HassioBackup };
    "backup-cleared": undefined;
  }
}

@customElement("hassio-upload-backup")
export class HassioUploadBackup extends LitElement {
  public hass?: HomeAssistant;

  @property({ attribute: false }) public localize?: LocalizeFunc;

  @state() public value: string | null = null;

  @state() private _uploading = false;

  public render(): TemplateResult {
    return html`
      <ha-file-upload
        .hass=${this.hass}
        .uploading=${this._uploading}
        .icon=${mdiFolderUpload}
        accept="application/x-tar"
        .label=${this.localize?.(
          "ui.panel.page-onboarding.restore.upload_backup"
        ) || "Upload backup"}
        .supports=${this.localize?.(
          "ui.panel.page-onboarding.restore.upload_supports"
        ) || "Supports .TAR files"}
        .secondary=${this.localize?.(
          "ui.panel.page-onboarding.restore.upload_drop"
        ) || "Or drop your file here"}
        @file-picked=${this._uploadFile}
        @files-cleared=${this._clear}
      ></ha-file-upload>
    `;
  }

  private _clear() {
    this.value = null;
    fireEvent(this, "backup-cleared");
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
      fireEvent(this, "hassio-backup-uploaded", { backup: backup.data });
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
