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

  private _lastSuccessfulBackup = memoizeOne((backups: BackupContent[]) => {
    const sortedBackups = backups
      .filter((backup) => backup.with_automatic_settings)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sortedBackups[0] as BackupContent | undefined;
  });

  private _nextBackupDescription(schedule: BackupScheduleState) {
    const time = getFormattedBackupTime(this.hass.locale, this.hass.config);

    switch (schedule) {
      case BackupScheduleState.DAILY:
        return `Next automatic backup tomorrow at ${time}`;
      case BackupScheduleState.MONDAY:
        return `Next automatic backup next Monday at ${time}`;
      case BackupScheduleState.TUESDAY:
        return `Next automatic backup next Thuesday at ${time}`;
      case BackupScheduleState.WEDNESDAY:
        return `Next automatic backup next Wednesday at ${time}`;
      case BackupScheduleState.THURSDAY:
        return `Next automatic backup next Thursday at ${time}`;
      case BackupScheduleState.FRIDAY:
        return `Next automatic backup next Friday at ${time}`;
      case BackupScheduleState.SATURDAY:
        return `Next automatic backup next Saturday at ${time}`;
      case BackupScheduleState.SUNDAY:
        return `Next automatic backup next Sunday at ${time}`;
      default:
        return "No automatic backup scheduled";
    }
  }

  protected render() {
    if (this.fetching) {
      return html`
        <ha-backup-summary-card heading="Loading backups" status="loading">
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

    const lastSuccessfulBackup = this._lastSuccessfulBackup(this.backups);

    const lastSuccessfulBackupDate = lastSuccessfulBackup
      ? new Date(lastSuccessfulBackup.date)
      : new Date(0);

    const lastAttempt = this.config.last_attempted_automatic_backup
      ? new Date(this.config.last_attempted_automatic_backup)
      : undefined;

    const now = new Date();

    const lastBackupDescription = lastSuccessfulBackup
      ? `Last successful backup ${relativeTime(lastSuccessfulBackupDate, this.hass.locale, now, true)} and stored in ${lastSuccessfulBackup.agent_ids?.length} locations.`
      : "You have no successful backups.";

    if (lastAttempt && lastAttempt > lastSuccessfulBackupDate) {
      const lastAttemptDescription = `The last automatic backup trigged ${relativeTime(lastAttempt, this.hass.locale, now, true)} wasn't successful.`;
      return html`
        <ha-backup-summary-card
          heading="Last automatic backup failed"
          status="error"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">${lastAttemptDescription}</span>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span slot="headline">${lastBackupDescription}</span>
            </ha-md-list-item>
          </ha-md-list>
        </ha-backup-summary-card>
      `;
    }

    if (!lastSuccessfulBackup) {
      return html`
        <ha-backup-summary-card
          heading="No automatic backup available"
          description="You have no automatic backups yet."
          status="warning"
        >
        </ha-backup-summary-card>
      `;
    }

    const nextBackupDescription = this._nextBackupDescription(
      this.config.schedule.state
    );

    const numberOfDays = differenceInDays(
      // Subtract a few hours to avoid showing as overdue if it's just a few hours (e.g. daylight saving)
      addHours(now, -OVERDUE_MARGIN_HOURS),
      lastSuccessfulBackupDate
    );

    const isOverdue =
      (numberOfDays >= 1 &&
        this.config.schedule.state === BackupScheduleState.DAILY) ||
      numberOfDays >= 7;

    if (isOverdue) {
      return html`
        <ha-backup-summary-card
          heading=${`No backup for ${numberOfDays} days`}
          status="warning"
        >
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span slot="headline">${lastBackupDescription}</span>
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
      <ha-backup-summary-card heading=${`Backed up`} status="success">
        <ha-md-list>
          <ha-md-list-item>
            <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
            <span slot="headline">${lastBackupDescription}</span>
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
