import { mdiCalendar, mdiDatabase, mdiPuzzle, mdiUpload } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { BackupAgent, BackupConfig } from "../../../../../data/backup";
import {
  BackupScheduleRecurrence,
  computeBackupAgentName,
  getFormattedBackupTime,
  isLocalAgent,
} from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { getRecorderInfo } from "../../../../../data/recorder";

@customElement("ha-backup-overview-settings")
class HaBackupBackupsSummary extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: BackupConfig;

  @property({ attribute: false }) public agents!: BackupAgent[];

  @state() private _showDbOption = true;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this._checkDbOption();
  }

  private _configure() {
    navigate("/config/backup/settings");
  }

  private async _checkDbOption() {
    if (isComponentLoaded(this.hass, "recorder")) {
      const info = await getRecorderInfo(this.hass.connection);
      this._showDbOption = info.db_in_default_location;
    } else {
      this._showDbOption = false;
    }
  }

  private _scheduleDescription(config: BackupConfig): string {
    const { copies, days } = config.retention;
    const { recurrence } = config.schedule;

    if (recurrence === BackupScheduleRecurrence.NEVER) {
      return this.hass.localize(
        "ui.panel.config.backup.overview.settings.schedule_never"
      );
    }

    const time: string | undefined | null =
      this.config.schedule.time &&
      getFormattedBackupTime(
        this.hass.locale,
        this.hass.config,
        this.config.schedule.time
      );

    let scheduleText = this.hass.localize(
      "ui.panel.config.backup.overview.settings.schedule_never"
    );

    const configDays = this.config.schedule.days;

    if (
      this.config.schedule.recurrence === BackupScheduleRecurrence.DAILY ||
      (this.config.schedule.recurrence ===
        BackupScheduleRecurrence.CUSTOM_DAYS &&
        configDays.length === 7)
    ) {
      scheduleText = this.hass.localize(
        `ui.panel.config.backup.overview.settings.schedule_${!this.config.schedule.time ? "optimized_" : ""}daily`,
        {
          time,
        }
      );
    } else if (
      this.config.schedule.recurrence ===
        BackupScheduleRecurrence.CUSTOM_DAYS &&
      configDays.length !== 0
    ) {
      if (
        configDays.length === 2 &&
        configDays.includes("sat") &&
        configDays.includes("sun")
      ) {
        scheduleText = this.hass.localize(
          `ui.panel.config.backup.overview.settings.schedule_${!this.config.schedule.time ? "optimized_" : ""}weekend`,
          {
            time,
          }
        );
      } else if (
        configDays.length === 5 &&
        !configDays.includes("sat") &&
        !configDays.includes("sun")
      ) {
        scheduleText = this.hass.localize(
          `ui.panel.config.backup.overview.settings.schedule_${!this.config.schedule.time ? "optimized_" : ""}weekdays`,
          {
            time,
          }
        );
      } else {
        scheduleText = this.hass.localize(
          `ui.panel.config.backup.overview.settings.schedule_${!this.config.schedule.time ? "optimized_" : ""}days`,
          {
            count: configDays.length,
            days: configDays
              .map((dayCode) =>
                this.hass.localize(
                  `ui.panel.config.backup.overview.settings.${configDays.length > 2 ? "short_weekdays" : "weekdays"}.${dayCode}`
                )
              )
              .join(", "),
            time,
          }
        );
      }
    }

    let copiesText = this.hass.localize(
      `ui.panel.config.backup.overview.settings.schedule_copies_all`
    );
    if (copies) {
      copiesText = this.hass.localize(
        `ui.panel.config.backup.overview.settings.schedule_copies_backups`,
        { count: copies }
      );
    } else if (days) {
      copiesText = this.hass.localize(
        `ui.panel.config.backup.overview.settings.schedule_copies_days`,
        { count: days }
      );
    }

    return scheduleText + " " + copiesText;
  }

  private _addonsDescription(config: BackupConfig): string {
    if (config.create_backup.include_all_addons) {
      return this.hass.localize(
        "ui.panel.config.backup.overview.settings.addons_all"
      );
    }
    const count = config.create_backup.include_addons?.length;
    if (count) {
      return this.hass.localize(
        "ui.panel.config.backup.overview.settings.addons_many",
        { count }
      );
    }
    return this.hass.localize(
      "ui.panel.config.backup.overview.settings.addons_none"
    );
  }

  private _locationsDescription(config: BackupConfig): string {
    const hasLocal = config.create_backup.agent_ids.some((a) =>
      isLocalAgent(a)
    );

    const offsiteLocations = config.create_backup.agent_ids.filter(
      (a) => !isLocalAgent(a)
    );

    if (offsiteLocations.length) {
      if (offsiteLocations.length === 1) {
        const name = computeBackupAgentName(
          this.hass.localize,
          offsiteLocations[0],
          this.agents
        );
        return this.hass.localize(
          "ui.panel.config.backup.overview.settings.locations_one",
          { name }
        );
      }
      return this.hass.localize(
        "ui.panel.config.backup.overview.settings.locations_many",
        { count: offsiteLocations.length }
      );
    }
    if (hasLocal) {
      return this.hass.localize(
        "ui.panel.config.backup.overview.settings.locations_local_only"
      );
    }
    return this.hass.localize(
      "ui.panel.config.backup.overview.settings.locations_none"
    );
  }

  render() {
    const isHassio = this.hass.config.components.includes("hassio");

    return html`
      <ha-card class="my-backups">
        <div class="card-header">
          ${this.hass.localize(
            "ui.panel.config.backup.overview.settings.title"
          )}
        </div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href="/config/backup/settings#schedule"
            >
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <div slot="headline">
                ${this._scheduleDescription(this.config)}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.settings.schedule"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" href="/config/backup/settings#data">
              <ha-svg-icon slot="start" .path=${mdiDatabase}></ha-svg-icon>
              <div slot="headline">
                ${this._showDbOption &&
                this.config.create_backup.include_database
                  ? this.hass.localize(
                      "ui.panel.config.backup.overview.settings.data_settings_history"
                    )
                  : this.hass.localize(
                      "ui.panel.config.backup.overview.settings.data_settings_only"
                    )}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.settings.data"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            ${isHassio
              ? html`
                  <ha-md-list-item
                    type="link"
                    href="/config/backup/settings#data"
                  >
                    <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
                    <div slot="headline">
                      ${this._addonsDescription(this.config)}
                    </div>
                    <div slot="supporting-text">
                      ${this.hass.localize(
                        "ui.panel.config.backup.overview.settings.addons"
                      )}
                    </div>
                    <ha-icon-next slot="end"></ha-icon-next>
                  </ha-md-list-item>
                `
              : nothing}
            <ha-md-list-item
              type="link"
              href="/config/backup/settings#locations"
            >
              <ha-svg-icon slot="start" .path=${mdiUpload}></ha-svg-icon>
              <div slot="headline">
                ${this._locationsDescription(this.config)}
              </div>
              <div slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.overview.settings.locations"
                )}
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div class="card-actions">
          <ha-button @click=${this._configure} appearance="filled">
            ${this.hass.localize(
              "ui.panel.config.backup.overview.settings.configure"
            )}
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
        .card-header {
          padding-bottom: 8px;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
          padding-bottom: 0;
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
