import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-alert";
import "../../../../components/ha-file-upload";
import { mdiFolderUpload } from "@mdi/js";
import type { HomeAssistant } from "../../../../types";
import {
  fireEvent,
  type HASSDomEvent,
} from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export const SUPPORTED_FORMAT = "application/x-tar";

export interface BackupFileFormData {
  file?: File;
}

export const INITIAL_FORM_DATA: BackupFileFormData = {
  file: undefined,
};

@customElement("ha-backup-upload")
class HaBackupUpload extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public uploading = false;

  @property() public error?: string;

  @property({ attribute: false }) public localize?: LocalizeFunc;

  @state() public formData?: BackupFileFormData;

  render() {
    const localize = this.localize || this.hass.localize;

    return html`
      ${this.error
        ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
        : nothing}
      <ha-file-upload
        .hass=${this.hass}
        .uploading=${this.uploading}
        .icon=${mdiFolderUpload}
        accept=${SUPPORTED_FORMAT}
        .localize=${localize}
        .label=${localize("ui.panel.config.backup.dialogs.upload.input_label")}
        .supports=${localize(
          "ui.panel.config.backup.dialogs.upload.supports_tar"
        )}
        @file-picked=${this._filePicked}
        @files-cleared=${this._filesCleared}
      ></ha-file-upload>
    `;
  }

  private _filePicked(ev: HASSDomEvent<{ files: File[] }>) {
    fireEvent(this, "file-picked", { files: ev.detail.files });
  }

  private _filesCleared() {
    fireEvent(this, "files-cleared");
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-upload": HaBackupUpload;
  }
}
