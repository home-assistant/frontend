import { mdiBackupRestore, mdiCalendar, mdiInformation } from "@mdi/js";
import { addHours, differenceInDays, isToday, isTomorrow } from "date-fns";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-icon-button";
import type { BackupConfig, BackupContent } from "../../../../../data/backup";
import {
  BackupScheduleRecurrence,
  getFormattedBackupTime,
} from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-backup-summary-card";
import {
  formatDate,
  formatDateWeekday,
} from "../../../../../common/datetime/format_date";
import { showAlertDialog } from "../../../../lovelace/custom-card-helpers";

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

    const lastAttemptDate = this.config.last_attempted_automatic_backup
      ? new Date(this.config.last_attempted_automatic_backup)
      : new Date(0);

    const lastCompletedDate = this.config.last_completed_automatic_backup
      ? new Date(this.config.last_completed_automatic_backup)
      : new Date(0);

    const nextAutomaticDate = this.config.next_automatic_backup
      ? new Date(this.config.next_automatic_backup)
      : undefined;

    const backupTime = getFormattedBackupTime(
      this.hass.locale,
      this.hass.config,
      nextAutomaticDate || this.config.schedule.time
    );

    const showAdditionalBackupDescription =
      this.config.next_automatic_backup_additional;

    const nextBackupDescription =
      this.config.schedule.recurrence === BackupScheduleRecurrence.NEVER ||
      (this.config.schedule.recurrence ===
        BackupScheduleRecurrence.CUSTOM_DAYS &&
        this.config.schedule.days.length === 0)
        ? this.hass.localize(
            `ui.panel.config.backup.overview.summary.no_automatic_backup`
          )
        : nextAutomaticDate
          ? this.hass.localize(
              `ui.panel.config.backup.overview.summary.next_automatic_backup`,
              {
                day: isTomorrow(nextAutomaticDate)
                  ? this.hass.localize(
                      "ui.panel.config.backup.overview.summary.tomorrow"
                    )
                  : isToday(nextAutomaticDate)
                    ? this.hass.localize(
                        "ui.panel.config.backup.overview.summary.today"
                      )
                    : formatDateWeekday(
                        nextAutomaticDate,
                        this.hass.locale,
                        this.hass.config
                      ),
                time: backupTime,
              }
            )
          : "";

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
            ${lastUploadedBackup || nextBackupDescription
              ? html`
                  <ha-md-list-item>
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiCalendar}
                    ></ha-svg-icon>
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
                              count: Object.keys(lastUploadedBackup.agents)
                                .length,
                            }
                          )
                        : nextBackupDescription}
                    </span>
                  </ha-md-list-item>
                `
              : nothing}
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
            ${this._renderNextBackupDescription(
              nextBackupDescription,
              lastCompletedDate,
              showAdditionalBackupDescription
            )}
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

            ${lastUploadedBackup || nextBackupDescription
              ? html` <ha-md-list-item>
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
                            count: Object.keys(lastUploadedBackup.agents)
                              .length,
                          }
                        )
                      : nextBackupDescription}
                  </span>
                </ha-md-list-item>`
              : nothing}
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
        count: Object.keys(lastBackup.agents).length,
      }
    );

    const numberOfDays = differenceInDays(
      // Subtract a few hours to avoid showing as overdue if it's just a few hours (e.g. daylight saving)
      addHours(now, -OVERDUE_MARGIN_HOURS),
      lastBackupDate
    );

    const isOverdue =
      (numberOfDays >= 1 &&
        this.config.schedule.recurrence === BackupScheduleRecurrence.DAILY) ||
      numberOfDays >= 7;

    return html`
      <ha-backup-summary-card
        .heading=${this.hass.localize(
          `ui.panel.config.backup.overview.summary.${isOverdue ? "backup_too_old_heading" : "backup_success_heading"}`,
          { count: numberOfDays }
        )}
        .status=${isOverdue ? "warning" : "success"}
      >
        <ha-md-list>
          <ha-md-list-item>
            <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
            <span slot="headline">${lastSuccessfulBackupDescription}</span>
          </ha-md-list-item>
          ${this._renderNextBackupDescription(
            nextBackupDescription,
            lastCompletedDate,
            showAdditionalBackupDescription
          )}
        </ha-md-list>
      </ha-backup-summary-card>
    `;
  }

  private _renderNextBackupDescription(
    nextBackupDescription: string,
    lastCompletedDate: Date,
    showTip = false
  ) {
    // handle edge case that there is an additional backup scheduled
    const openAdditionalBackupDescriptionDialog = showTip
      ? () => {
          showAlertDialog(this, {
            text: this.hass.localize(
              "ui.panel.config.backup.overview.summary.additional_backup_description",
              {
                date: formatDate(
                  lastCompletedDate,
                  this.hass.locale,
                  this.hass.config
                ),
              }
            ),
          });
        }
      : undefined;

    return nextBackupDescription
      ? html`<ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
          <span slot="headline">${nextBackupDescription}</span>

          ${showTip
            ? html` <ha-icon-button
                slot="end"
                @click=${openAdditionalBackupDescriptionDialog}
                .path=${mdiInformation}
              ></ha-icon-button>`
            : nothing}
        </ha-md-list-item>`
      : nothing;
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
