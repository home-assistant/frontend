import { mdiCalendar, mdiCog, mdiPuzzle, mdiUpload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { BackupConfig } from "../../../../../data/backup";
import { BackupScheduleState, isLocalAgent } from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-backup-overview-settings")
class HaBackupBackupsSummary extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: BackupConfig;

  private _configure() {
    navigate("/config/backup/settings");
  }

  private _scheduleDescription(config: BackupConfig): string {
    const { copies, days } = config.retention;
    const { state: schedule } = config.schedule;

    if (schedule === BackupScheduleState.NEVER) {
      return "Automatic backups are disabled";
    }

    let copiesText = "and keep all backups";
    if (copies) {
      copiesText = `and keep the latest ${copies} copie(s)`;
    } else if (days) {
      copiesText = `and keep backups for ${days} day(s)`;
    }

    let scheduleText = "";
    if (schedule === BackupScheduleState.DAILY) {
      scheduleText = `Daily at 04:45`;
    }
    if (schedule === BackupScheduleState.MONDAY) {
      scheduleText = `Weekly on Mondays at 04:45`;
    }
    if (schedule === BackupScheduleState.TUESDAY) {
      scheduleText = `Weekly on Thuesdays at 04:45`;
    }
    if (schedule === BackupScheduleState.WEDNESDAY) {
      scheduleText = `Weekly on Wednesdays at 04:45`;
    }
    if (schedule === BackupScheduleState.THURSDAY) {
      scheduleText = `Weekly on Thursdays at 04:45`;
    }
    if (schedule === BackupScheduleState.FRIDAY) {
      scheduleText = `Weekly on Fridays at 04:45`;
    }
    if (schedule === BackupScheduleState.SATURDAY) {
      scheduleText = `Weekly on Saturdays at 04:45`;
    }
    if (schedule === BackupScheduleState.SUNDAY) {
      scheduleText = `Weekly on Sundays at 04:45`;
    }

    return scheduleText + " " + copiesText;
  }

  private _addonsDescription(config: BackupConfig): string {
    if (config.create_backup.include_all_addons) {
      return "All add-ons, including new";
    }
    if (config.create_backup.include_addons?.length) {
      return `${config.create_backup.include_addons.length} add-ons`;
    }
    return "No add-ons";
  }

  private _agentsDescription(config: BackupConfig): string {
    const hasLocal = config.create_backup.agent_ids.some((a) =>
      isLocalAgent(a)
    );

    const offsiteLocations = config.create_backup.agent_ids.filter(
      (a) => !isLocalAgent(a)
    );

    if (offsiteLocations.length) {
      return `Upload to ${offsiteLocations.length} off-site locations`;
    }
    if (hasLocal) {
      return "Local backup only";
    }
    return "No location configured";
  }

  render() {
    const isHassio = this.hass.config.components.includes("hassio");

    return html`
      <ha-card class="my-backups">
        <div class="card-header">Automatic backups</div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <div slot="headline">
                ${this._scheduleDescription(this.config)}
              </div>
              <div slot="supporting-text">
                Schedule and number of backups to keep
              </div>
            </ha-md-list-item>
            <ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
              <div slot="headline">
                ${this.config.create_backup.include_database
                  ? "Settings and history"
                  : "Settings only"}
              </div>
              <div slot="supporting-text">
                Home Assistant data that is included
              </div>
            </ha-md-list-item>
            ${isHassio
              ? html`
                  <ha-md-list-item>
                    <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
                    <div slot="headline">
                      ${this._addonsDescription(this.config)}
                    </div>
                    <div slot="supporting-text">Add-ons that are included</div>
                  </ha-md-list-item>
                  <ha-md-list-item>
                    <ha-svg-icon slot="start" .path=${mdiUpload}></ha-svg-icon>
                    <div slot="headline">
                      ${this._agentsDescription(this.config)}
                    </div>
                    <div slot="supporting-text">
                      Locations where backup is uploaded to
                    </div>
                  </ha-md-list-item>
                `
              : nothing}
          </ha-md-list>
        </div>
        <div class="card-actions">
          <ha-button @click=${this._configure}>
            Configure automatic backups
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 690px;
          margin: 0 auto;
          gap: 24px;
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          margin-bottom: 72px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-settings": HaBackupBackupsSummary;
  }
}
