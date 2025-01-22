import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-card";
import {
  INITIAL_FORM_DATA,
  SUPPORTED_FORMAT,
} from "../../panels/config/backup/components/ha-backup-upload";
import type { HomeAssistant } from "../../types";
import { haStyle } from "../../resources/styles";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import {
  CORE_LOCAL_AGENT,
  HASSIO_LOCAL_AGENT,
  uploadBackup,
} from "../../data/backup";
import type { LocalizeFunc } from "../../common/translations/localize";

@customElement("onboarding-restore-backup-upload")
class OnboardingRestoreBackupUpload extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public supervisor = false;

  @property({ attribute: false }) public localize!: LocalizeFunc;

  @state() private _uploading = false;

  @state() private _error?: string;

  @state() private _formData = INITIAL_FORM_DATA;

  render() {
    return html`
      <ha-card
        .header=${this.localize(
          "ui.panel.page-onboarding.restore.upload_backup"
        )}
      >
        <div class="card-content">
          <ha-backup-upload
            .hass=${this.hass}
            .error=${this._error}
            .uploading=${this._uploading}
            @file-picked=${this._filePicked}
            @files-cleared=${this._filesCleared}
            .localize=${this.localize}
          ></ha-backup-upload>
        </div>
        <div class="card-actions">
          <ha-button
            @click=${this._upload}
            .disabled=${!this._formValid() || this._uploading}
          >
            ${this.localize(
              "ui.panel.page-onboarding.restore.upload_backup_action"
            )}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  private _formValid() {
    return this._formData?.file !== undefined;
  }

  private _filePicked(ev: HASSDomEvent<{ files: File[] }>) {
    this._error = undefined;
    const file = ev.detail.files[0];

    this._formData = {
      ...this._formData!,
      file,
    };
  }

  private _filesCleared() {
    this._error = undefined;
    this._formData = INITIAL_FORM_DATA;
  }

  private async _upload() {
    const { file } = this._formData!;
    if (!file || file.type !== SUPPORTED_FORMAT) {
      showAlertDialog(this, {
        title: this.localize(
          "ui.panel.page-onboarding.restore.unsupported.title"
        ),
        text: this.localize(
          "ui.panel.page-onboarding.restore.unsupported.text"
        ),
        confirmText: this.localize("ui.common.ok"),
      });
      return;
    }

    const agentIds = this.supervisor
      ? [HASSIO_LOCAL_AGENT]
      : [CORE_LOCAL_AGENT];

    this._uploading = true;
    try {
      await uploadBackup(file, agentIds);
    } catch (err: any) {
      this._error = err.message;
    } finally {
      this._uploading = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          width: 100%;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .card-content {
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
