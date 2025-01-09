import { mdiBackupRestore, mdiCalendar } from "@mdi/js";
import { addHours, differenceInDays } from "date-fns";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { BackupConfig, BackupContent } from "../../../../../data/backup";
import {
  BackupScheduleState,
  getFormattedBackupTime,
} from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-backup-summary-card";

const OVERDUE_MARGIN_HOURS = 3;

@customElement("ha-backup-overview-summary")
class HaBackupOverviewBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public config!: BackupConfig;

  @property({ type: Boolean }) public fetching = false;

  private _sortedBackups = memoizeOne((backups: BackupContent[]) =>
    backups
      .filter((backup) => backup.with_automatic_settings)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  );

  private _lastBackup = memoizeOne((backups: BackupContent[]) => {
    const sortedBackups = this._sortedBackups(backups);
    return sortedBackups[0] as BackupContent | undefined;
  });

  private _lastUploadedBackup = memoizeOne((backups: BackupContent[]) => {
    const sortedBackups = this._sortedBackups(backups);
    return sortedBackups.find(
      (backup) => backup.failed_agent_ids?.length === 0
    );
  });

  protected render() {
    const now = new Date();

    if (this.fetching) {
      return html`
        <ha-backup-summary-card
          .heading=${this.hass.localize(
            "ui.panel.config.backup.overview.summary.loading"
          )}
          status="loading"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline" class="skeleton"></span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline" class="skeleton"></span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    const lastBackup = this._lastBackup(this.backups);

    const backupTime = getFormattedBackupTime(
      this.hass.locale,
      this.hass.config
    );

    const nextBackupDescription = this.hass.localize(
      `ui.panel.config.backup.overview.summary.next_backup_description.${this.config.schedule.state}`,
      { time: backupTime }
    );

    const lastAttemptDate = this.config.last_attempted_automatic_backup
      ? new Date(this.config.last_attempted_automatic_backup)
      : new Date(0);

    const lastCompletedDate = this.config.last_completed_automatic_backup
      ? new Date(this.config.last_completed_automatic_backup)
      : new Date(0);

    // If last attempt is after last completed backup, show error
    if (lastAttemptDate > lastCompletedDate) {
      const lastUploadedBackup = this._lastUploadedBackup(this.backups);

      return html`
        <ha-backup-summary-card
          .heading=${this.hass.localize(
            "ui.panel.config.backup.overview.summary.last_backup_failed_heading"
          )}
          status="error"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.summary.last_backup_failed_description",
                  {
                    relative_time: relativeTime(
                      lastAttemptDate,
                      this.hass.locale,
                      now,
                      true
                    ),
                  }
                )}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">
                ${lastUploadedBackup
                  ? this.hass.localize(
                      "ui.panel.config.backup.overview.summary.last_successful_backup_description",
                      {
                        relative_time: relativeTime(
                          new Date(lastUploadedBackup.date),
                          this.hass.locale,
                          now,
                          true
                        ),
                        count: lastUploadedBackup.agent_ids?.length ?? 0,
                      }
                    )
                  : nextBackupDescription}
              </span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    // If no backups yet, show warning
    if (!lastBackup) {
      return html`
        <ha-backup-summary-card
          .heading=${this.hass.localize(
            "ui.panel.config.backup.overview.summary.no_backup_heading"
          )}
          status="warning"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.summary.no_backup_description"
                )}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">${nextBackupDescription}</span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    const lastBackupDate = new Date(lastBackup.date);

    // If last backup
    if (lastBackup.failed_agent_ids?.length) {
      const lastUploadedBackup = this._lastUploadedBackup(this.backups);

      return html`
        <ha-backup-summary-card
          .heading=${this.hass.localize(
            "ui.panel.config.backup.overview.summary.last_backup_failed_heading"
          )}
          status="error"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.summary.last_backup_failed_locations_description",
                  {
                    relative_time: relativeTime(
                      lastAttemptDate,
                      this.hass.locale,
                      now,
                      true
                    ),
                  }
                )}
              </span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">
                ${lastUploadedBackup
                  ? this.hass.localize(
                      "ui.panel.config.backup.overview.summary.last_successful_backup_description",
                      {
                        relative_time: relativeTime(
                          new Date(lastUploadedBackup.date),
                          this.hass.locale,
                          now,
                          true
                        ),
                        count: lastUploadedBackup.agent_ids?.length ?? 0,
                      }
                    )
                  : nextBackupDescription}
              </span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    const lastSuccessfulBackupDescription = this.hass.localize(
      "ui.panel.config.backup.overview.summary.last_successful_backup_description",
      {
        relative_time: relativeTime(
          new Date(lastBackup.date),
          this.hass.locale,
          now,
          true
        ),
        count: lastBackup.agent_ids?.length ?? 0,
      }
    );

    const numberOfDays = differenceInDays(
      // Subtract a few hours to avoid showing as overdue if it's just a few hours (e.g. daylight saving)
      addHours(now, -OVERDUE_MARGIN_HOURS),
      lastBackupDate
    );

    const isOverdue =
      (numberOfDays >= 1 &&
        this.config.schedule.state === BackupScheduleState.DAILY) ||
      numberOfDays >= 7;

    if (isOverdue) {
      return html`
        <ha-backup-summary-card
          .heading=${this.hass.localize(
            "ui.panel.config.backup.overview.summary.backup_too_old_heading",
            { count: numberOfDays }
          )}
          status="warning"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">${lastSuccessfulBackupDescription}</span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">${nextBackupDescription}</span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    return html`
      <ha-backup-summary-card
        .heading=${this.hass.localize(
          "ui.panel.config.backup.overview.summary.backup_success_heading"
        )}
        status="success"
      >
        <ha-md-list>
          <ha-md-list-item>
            <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
            <span slot="headline">${lastSuccessfulBackupDescription}</span>
          </ha-md-list-item>
          <ha-md-list-item>
            <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
            <span slot="headline">${nextBackupDescription}</span>
          </ha-md-list-item>
        </ha-md-list>
      </ha-backup-summary-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16px;
        }
        p {
          margin: 0;
        }
        ha-svg-icon {
          flex: none;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          border-top: none;
        }
        ha-md-list {
          background: none;
        }
        ha-md-list-item {
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
          --md-list-item-one-line-container-height: 40x;
        }
        span.skeleton {
          position: relative;
          display: block;
          width: 160px;
          animation-fill-mode: forwards;
          animation-iteration-count: infinite;
          animation-name: loading;
          animation-timing-function: linear;
          animation-duration: 1.2s;
          border-radius: 4px;
          height: 16px;
          margin: 2px 0;
          background: linear-gradient(
              to right,
              var(--card-background-color) 8%,
              var(--secondary-background-color) 18%,
              var(--card-background-color) 33%
            )
            0% 0% / 936px 104px;
        }

        @keyframes loading {
          0% {
            background-position: -468px 0;
          }
          100% {
            background-position: 468px 0;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-summary": HaBackupOverviewBackups;
  }
}
