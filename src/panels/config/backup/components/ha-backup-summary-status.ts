import { differenceInDays } from "date-fns";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatShortDateTime } from "../../../../common/datetime/format_date_time";
import type { BackupContent } from "../../../../data/backup";
import type { ManagerStateEvent } from "../../../../data/backup_manager";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-summary-card";

@customElement("ha-backup-summary-status")
export class HaBackupSummaryProgress extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public manager!: ManagerStateEvent;

  @property({ attribute: false }) public backups!: BackupContent[];

  @property({ type: Boolean, attribute: "has-action" })
  public hasAction = false;

  private _lastBackup = memoizeOne((backups: BackupContent[]) => {
    const sortedBackups = backups
      // eslint-disable-next-line arrow-body-style
      .filter((backup) => {
        // TODO : only show backups with default flag
        return backup.with_strategy_settings;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return sortedBackups[0] as BackupContent | undefined;
  });

  protected render() {
    const lastBackup = this._lastBackup(this.backups);

    if (!lastBackup) {
      return html`
        <ha-backup-summary-card
          heading="No backup available"
          description="You have not created any backups yet."
          .hasAction=${this.hasAction}
          status="warning"
        >
          <slot name="action" slot="action"></slot>
        </ha-backup-summary-card>
      `;
    }

    const lastBackupDate = new Date(lastBackup.date);
    const numberOfDays = differenceInDays(new Date(), lastBackupDate);

    // TODO : Improve time format
    const description = `Last successful backup ${formatShortDateTime(lastBackupDate, this.hass.locale, this.hass.config)} and synced to ${lastBackup.agent_ids?.length} locations`;
    if (numberOfDays > 8) {
      return html`
        <ha-backup-summary-card
          heading=${`No backup for ${numberOfDays} days`}
          description=${description}
          .hasAction=${this.hasAction}
          status="warning"
        >
          <slot name="action" slot="action"></slot>
        </ha-backup-summary-card>
      `;
    }
    return html`
      <ha-backup-summary-card
        heading=${`Backed up`}
        description=${description}
        .hasAction=${this.hasAction}
        status="success"
      >
        <slot name="action" slot="action"></slot>
      </ha-backup-summary-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-summary-status": HaBackupSummaryProgress;
  }
}
