import "@material/mwc-linear-progress/mwc-linear-progress";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-button";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupOnboardingInfo } from "../../data/backup_onboarding";
import { onBoardingStyles } from "../styles";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("onboarding-restore-backup-status")
class OnboardingRestoreBackupStatus extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false })
  public backupInfo!: BackupOnboardingInfo;

  render() {
    return html`
      <h1>
        ${this.localize(
          `ui.panel.page-onboarding.restore.${this.backupInfo.state === "restore_backup" ? "in_progress" : "failed"}`
        )}
      </h1>
      ${this.backupInfo.state === "restore_backup"
        ? html` <p>
            ${this.localize(
              `ui.panel.page-onboarding.restore.in_progress_description`
            )}
          </p>`
        : nothing}
      <div class="card-content">
        ${this.backupInfo.state === "restore_backup"
          ? html`
              <div class="loading">
                <mwc-linear-progress indeterminate></mwc-linear-progress>
              </div>
            `
          : html`
              <ha-alert alert-type="error">
                ${this.localize(
                  "ui.panel.page-onboarding.restore.failed_status_description"
                )}
              </ha-alert>
              ${this.backupInfo.last_action_event?.reason
                ? html`
                    <div class="failed">
                      <h4>Error:</h4>
                      ${this.backupInfo.last_action_event?.reason}
                    </div>
                  `
                : nothing}
            `}
      </div>
      ${this.backupInfo.state !== "restore_backup"
        ? html`<div class="actions">
            <ha-button @click=${this._back}>
              ${this.localize("ui.panel.page-onboarding.restore.back")}
            </ha-button>
          </div>`
        : nothing}
    `;
  }

  private _back() {
    fireEvent(this, "restore-backup-back");
  }

  static get styles(): CSSResultGroup {
    return [
      onBoardingStyles,
      css`
        h1,
        p {
          text-align: left;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 32px;
        }
        p {
          text-align: center;
          padding: 0 16px;
          font-size: var(--ha-font-size-l);
        }
        .failed {
          padding: 16px 0;
          font-size: var(--ha-font-size-l);
        }
        mwc-linear-progress {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "onboarding-restore-backup-status": OnboardingRestoreBackupStatus;
  }
  interface HASSDomEvents {
    "restore-started";
  }
}
