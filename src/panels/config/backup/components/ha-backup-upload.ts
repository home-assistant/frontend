import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-alert";
import "../../../../components/ha-file-upload";
import { mdiFolderUpload } from "@mdi/js";
import type { HomeAssistant } from "../../../../types";
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
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public uploading = false;

  @property() public error?: string;

  @property({ attribute: false }) public localize?: LocalizeFunc;

  @property() public label?: string;

  @property() public secondary?: string;

  @property() public supports?: string;

  render() {
    return html`
      ${this.error
        ? html`<ha-alert alert-type="error">${this.error}</ha-alert>`
        : nothing}
      <ha-file-upload
        .hass=${this.hass}
        .uploading=${this.uploading}
        .icon=${mdiFolderUpload}
        accept=${SUPPORTED_FORMAT}
        .localize=${this.localize}
        .label=${this.label}
        .secondary=${this.secondary}
        .supports=${this.supports}
      ></ha-file-upload>
    `;
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-upload": HaBackupUpload;
  }
}
