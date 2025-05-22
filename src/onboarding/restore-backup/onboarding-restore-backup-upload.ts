import { mdiFolderUpload } from "@mdi/js";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-file-upload";
import "../../components/ha-alert";
import "../../components/ha-icon-button-arrow-prev";
import { fireEvent, type HASSDomEvent } from "../../common/dom/fire_event";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import {
  CORE_LOCAL_AGENT,
  HASSIO_LOCAL_AGENT,
  SUPPORTED_UPLOAD_FORMAT,
} from "../../data/backup";
import type { LocalizeFunc } from "../../common/translations/localize";
import { uploadOnboardingBackup } from "../../data/backup_onboarding";
import { onBoardingStyles } from "../styles";
import { navigate } from "../../common/navigate";
import { removeSearchParam } from "../../common/url/search-params";

declare global {
  interface HASSDomEvents {
    "backup-uploaded": { backupId: string };
  }
}
@customElement("onboarding-restore-backup-upload")
class OnboardingRestoreBackupUpload extends LitElement {
  @property({ type: Boolean }) public supervisor = false;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _uploading = false;

  @state() private _error?: string;

  render() {
    return html`
      <ha-icon-button-arrow-prev
        .label=${this.localize("ui.panel.page-onboarding.restore.back")}
        @click=${this._back}
      ></ha-icon-button-arrow-prev>
      <h1>
        ${this.localize("ui.panel.page-onboarding.restore.upload_backup")}
      </h1>
      <p>
        ${this.localize(
          "ui.panel.page-onboarding.restore.upload_backup_subtitle"
        )}
      </p>
      ${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      <ha-file-upload
        .uploading=${this._uploading}
        .icon=${mdiFolderUpload}
        accept=${SUPPORTED_UPLOAD_FORMAT}
        .localize=${this.localize}
        .label=${this.localize(
          "ui.panel.page-onboarding.restore.upload_input_label"
        )}
        .secondary=${this.localize(
          "ui.panel.page-onboarding.restore.upload_secondary"
        )}
        .supports=${this.localize(
          "ui.panel.page-onboarding.restore.upload_supports_tar"
        )}
        .deleteLabel=${this.localize("ui.panel.page-onboarding.restore.delete")}
        .uploadingLabel=${this.localize(
          "ui.panel.page-onboarding.restore.uploading"
        )}
        @file-picked=${this._filePicked}
      ></ha-file-upload>
    `;
  }

  private async _filePicked(ev: HASSDomEvent<{ files: File[] }>) {
    this._error = undefined;
    const file = ev.detail.files[0];

    if (!file || file.type !== SUPPORTED_UPLOAD_FORMAT) {
      showAlertDialog(this, {
        title: this.localize(
          "ui.panel.page-onboarding.restore.unsupported.title"
        ),
        text: this.localize(
          "ui.panel.page-onboarding.restore.unsupported.text"
        ),
        confirmText: this.localize("ui.panel.page-onboarding.restore.ok"),
      });
      return;
    }

    const agentIds = this.supervisor
      ? [HASSIO_LOCAL_AGENT]
      : [CORE_LOCAL_AGENT];

    this._uploading = true;
    try {
      const { backup_id } = await uploadOnboardingBackup(file, agentIds);
      fireEvent(this, "backup-uploaded", { backupId: backup_id });
    } catch (err: any) {
      this._error =
        typeof err.body === "string"
          ? err.body
          : err.body?.message || err.message || "Unknown error occurred";
    }
  }

  private _back() {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        h1,
        p {
          text-align: left;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-upload": OnboardingRestoreBackupUpload;
  }
}
