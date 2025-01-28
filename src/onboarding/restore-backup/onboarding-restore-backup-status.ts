import { css, html, LitElement, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-circular-progress";
import "../../components/ha-alert";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupOnboardingInfo } from "../../data/backup_onboarding";

declare global {
  interface HASSDomEvents {
    "restore-started";
  }
}
@customElement("onboarding-restore-backup-status")
class OnboardingRestoreBackupStatus extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ type: Object, attribute: "backup-info" })
  public backupInfo!: BackupOnboardingInfo;

  render() {
    return html`
      <ha-card
        .header=${this.localize(
          `ui.panel.page-onboarding.restore.${this.backupInfo.state === "restore_backup" ? "in_progress" : "failed"}`
        )}
      >
        <div class="card-content">
          ${this.backupInfo.state === "restore_backup"
            ? html`
                <div class="loading">
                  <ha-circular-progress indeterminate></ha-circular-progress>
                </div>
                <p>
                  ${this.localize(
                    "ui.panel.page-onboarding.restore.in_progress_description"
                  )}
                </p>
              `
            : html`
                <ha-alert alert-type="error">
                  ${this.localize(
                    "ui.panel.page-onboarding.restore.failed_status_description"
                  )}
                </ha-alert>
              `}
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 28px 20px 0;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 32px;
        }
        p {
          text-align: center;
          padding: 0 16px;
          font-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-status": OnboardingRestoreBackupStatus;
  }
}
