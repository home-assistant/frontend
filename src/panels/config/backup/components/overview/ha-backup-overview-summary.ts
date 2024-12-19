import { mdiBackupRestore, mdiCalendar } from "@mdi/js";
import { differenceInDays, setHours, setMinutes } from "date-fns";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatTime } from "../../../../../common/datetime/format_time";
import { relativeTime } from "../../../../../common/datetime/relative_time";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { BackupConfig, BackupContent } from "../../../../../data/backup";
import { BackupScheduleState } from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import "../ha-backup-summary-card";

@customElement("ha-backup-overview-summary")
class HaBackupOverviewBackups extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public backups: BackupContent[] = [];

  @property({ attribute: false }) public config!: BackupConfig;

  private _lastBackup = memoizeOne((backups: BackupContent[]) => {
    const sortedBackups = backups
      .filter((backup) => backup.with_automatic_settings)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sortedBackups[0] as BackupContent | undefined;
  });

  private _nextBackupDescription(schedule: BackupScheduleState) {
    const newDate = setMinutes(setHours(new Date(), 4), 45);
    const time = formatTime(newDate, this.hass.locale, this.hass.config);

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
    const lastBackup = this._lastBackup(this.backups);

    if (!lastBackup) {
      return html`
        <ha-backup-summary-card
          heading="No automatic backup available"
          description="You have no automatic backups yet."
          status="warning"
        >
        </ha-backup-summary-card>
      `;
    }

    const lastBackupDate = new Date(lastBackup.date);

    const numberOfDays = differenceInDays(new Date(), lastBackupDate);
    const now = new Date();

    const lastBackupDescription = `Last successful backup ${relativeTime(lastBackupDate, this.hass.locale, now, true)} and synced to ${lastBackup.agent_ids?.length} locations.`;
    const nextBackupDescription = this._nextBackupDescription(
      this.config.schedule.state
    );

    const lastAttempt = this.config.last_attempted_automatic_backup
      ? new Date(this.config.last_attempted_automatic_backup)
      : undefined;

    if (lastAttempt && lastAttempt > lastBackupDate) {
      const lastAttemptDescription = `The last automatic backup trigged ${relativeTime(lastAttempt, this.hass.locale, now, true)} wasn't successful.`;
      return html`
        <ha-backup-summary-card
          heading=${`Last automatic backup failed`}
          status="error"
        >
          <ul class="list">
            <li class="item">
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span>${lastAttemptDescription}</span>
            </li>
            <li class="item">
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span>${lastBackupDescription}</span>
            </li>
          </ul>
        </ha-backup-summary-card>
      `;
    }

    if (numberOfDays > 0) {
      return html`
        <ha-backup-summary-card
          heading=${`No backup for ${numberOfDays} days`}
          status="warning"
        >
          <ul class="list">
            <li class="item">
              <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
              <span>${lastBackupDescription}</span>
            </li>
            <li class="item">
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <span>${nextBackupDescription}</span>
            </li>
          </ul>
        </ha-backup-summary-card>
      `;
    }
    return html`
      <ha-backup-summary-card heading=${`Backed up`} status="success">
        <ul class="list">
          <li class="item">
            <ha-svg-icon slot="start" .path=${mdiBackupRestore}></ha-svg-icon>
            <span>${lastBackupDescription}</span>
          </li>
          <li class="item">
            <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
            <span>${nextBackupDescription}</span>
          </li>
        </ul>
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
        .list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 24px 24px 24px;
          margin: 0;
        }
        .item {
          display: flex;
          flex-direction: row;
          gap: 16px;
          align-items: center;
          color: var(--secondary-text-color);
          font-size: 14px;
          font-style: normal;
          font-weight: 400;
          line-height: 20px;
          letter-spacing: 0.25px;
        }
        ha-svg-icon {
          flex: none;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
          border-top: none;
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
