import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-spinner";
import "../../components/ha-alert";
import "../../components/ha-button";
import { haStyle } from "../../resources/styles";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { BackupOnboardingInfo } from "../../data/backup_onboarding";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { removeSearchParam } from "../../common/url/search-params";

@customElement("onboarding-restore-backup-status")
class OnboardingRestoreBackupStatus extends LitElement {
  @property({ attribute: false }) public localize!: LocalizeFunc;

  @property({ attribute: false })
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
                  <ha-spinner></ha-spinner>
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
                ${this.backupInfo.last_non_idle_event?.reason
                  ? html`
                      <div class="failed">
                        <h4>Error:</h4>
                        ${this.backupInfo.last_non_idle_event?.reason}
                      </div>
                    `
                  : nothing}
              `}
        </div>
        ${this.backupInfo.state !== "restore_backup"
          ? html`<div class="card-actions">
              <ha-button @click=${this._uploadAnother} destructive>
                ${this.localize(
                  `ui.panel.page-onboarding.restore.details.summary.upload_another`
                )}
              </ha-button>
              <ha-button @click=${this._home} destructive>
                ${this.localize(
                  `ui.panel.page-onboarding.restore.details.summary.home`
                )}
              </ha-button>
            </div>`
          : nothing}
      </ha-card>
    `;
  }

  private _uploadAnother() {
    fireEvent(this, "show-backup-upload");
  }

  private _home() {
    navigate(`${location.pathname}?${removeSearchParam("page")}`);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          padding: 28px 20px 0;
        }
        .card-actions {
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
          font-size: 16px;
        }
        .failed {
          padding: 16px 0;
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
  interface HASSDomEvents {
    "restore-started";
  }
}
