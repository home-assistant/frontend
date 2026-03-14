import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { formatTime } from "../../../../../common/datetime/format_time";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-textfield";
import "../../../../../components/ha-select";
import "../../../../../components/ha-time-input";
import "../../../../../components/ha-tip";
import type {
  BackupConfig,
  BackupDay,
  Retention,
} from "../../../../../data/backup";
import {
  BACKUP_DAYS,
  BackupScheduleRecurrence,
  DEFAULT_OPTIMIZED_BACKUP_END_TIME,
  DEFAULT_OPTIMIZED_BACKUP_START_TIME,
  sortWeekdays,
} from "../../../../../data/backup";
import type { SupervisorUpdateConfig } from "../../../../../data/supervisor/update";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import { documentationUrl } from "../../../../../util/documentation-url";
import "./ha-backup-config-retention";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

enum BackupScheduleTime {
  DEFAULT = "default",
  CUSTOM = "custom",
}

const SCHEDULE_OPTIONS = [
  BackupScheduleRecurrence.NEVER,
  BackupScheduleRecurrence.DAILY,
  BackupScheduleRecurrence.CUSTOM_DAYS,
] as const satisfies BackupScheduleRecurrence[];

const SCHEDULE_TIME_OPTIONS = [
  BackupScheduleTime.DEFAULT,
  BackupScheduleTime.CUSTOM,
] as const satisfies BackupScheduleTime[];

interface FormData {
  recurrence: BackupScheduleRecurrence;
  time_option: BackupScheduleTime;
  time?: string | null;
  days: BackupDay[];
  retention: Retention;
}

const INITIAL_FORM_DATA: FormData = {
  recurrence: BackupScheduleRecurrence.NEVER,
  time_option: BackupScheduleTime.DEFAULT,
  days: [],
  retention: {
    copies: 3,
  },
};

@customElement("ha-backup-config-schedule")
class HaBackupConfigSchedule extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: BackupConfigSchedule;

  @property({ type: Boolean }) public supervisor = false;

  @property({ attribute: false })
  public supervisorUpdateConfig?: SupervisorUpdateConfig;

  private _getData = memoizeOne((value?: BackupConfigSchedule): FormData => {
    if (!value) {
      return INITIAL_FORM_DATA;
    }

    const config = value;

    return {
      recurrence: config.schedule.recurrence,
      time_option: config.schedule.time
        ? BackupScheduleTime.CUSTOM
        : BackupScheduleTime.DEFAULT,
      time: config.schedule.time,
      days:
        config.schedule.recurrence === BackupScheduleRecurrence.CUSTOM_DAYS
          ? config.schedule.days
          : [],
      retention: config.retention,
    };
  });

  private _setData(data: FormData) {
    this.value = {
      ...this.value,
      schedule: {
        recurrence: data.recurrence,
        time: data.time_option === BackupScheduleTime.CUSTOM ? data.time : null,
        days:
          data.recurrence === BackupScheduleRecurrence.CUSTOM_DAYS
            ? data.days
            : [],
      },
      retention: data.retention,
    };

    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render() {
    const data = this._getData(this.value);

    return html`
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">
            ${this.hass.localize(
              "ui.panel.config.backup.schedule.schedule"
            )}</span
          >
          <span slot="supporting-text">
            ${this.hass.localize(
              "ui.panel.config.backup.schedule.schedule_description"
            )}
          </span>

          <ha-select
            slot="end"
            @selected=${this._scheduleChanged}
            .value=${data.recurrence}
            .options=${SCHEDULE_OPTIONS.map((option) => ({
              value: option,
              label: this.hass.localize(
                `ui.panel.config.backup.schedule.schedule_options.${option}`
              ),
            }))}
          ></ha-select>
        </ha-md-list-item>
        ${data.recurrence === BackupScheduleRecurrence.CUSTOM_DAYS
          ? html`<ha-expansion-panel
              expanded
              .header=${this.hass.localize(
                "ui.panel.config.backup.schedule.custom_schedule"
              )}
              outlined
            >
              <ha-md-list-item class="days">
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.backup_every"
                  )}
                </span>
                <div slot="end">
                  ${BACKUP_DAYS.map(
                    (day) => html`
                      <div>
                        <ha-formfield
                          .label=${this.hass.localize(`ui.panel.config.backup.overview.settings.weekdays.${day}`)}
                        >
                          <ha-checkbox
                            @change=${this._daysChanged}
                            .checked=${data.days.includes(day)}
                            .value=${day}
                          >
                          </ha-checkbox>
                        </span>
                        </ha-formfield>
                      </div>
                    `
                  )}
                </div>
              </ha-md-list-item>
            </ha-expansion-panel>`
          : nothing}
        ${data.recurrence === BackupScheduleRecurrence.DAILY ||
        (data.recurrence === BackupScheduleRecurrence.CUSTOM_DAYS &&
          data.days.length > 0)
          ? html`
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.time"
                  )}</span
                >
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.schedule_time_description",
                    {
                      time_range_start: formatTime(
                        DEFAULT_OPTIMIZED_BACKUP_START_TIME,
                        this.hass.locale,
                        this.hass.config
                      ),
                      time_range_end: formatTime(
                        DEFAULT_OPTIMIZED_BACKUP_END_TIME,
                        this.hass.locale,
                        this.hass.config
                      ),
                    }
                  )}
                </span>

                <ha-select
                  slot="end"
                  @selected=${this._scheduleTimeChanged}
                  .value=${data.time_option}
                  .options=${SCHEDULE_TIME_OPTIONS.map((option) => ({
                    value: option,
                    label: this.hass.localize(
                      `ui.panel.config.backup.schedule.time_options.${option}`
                    ),
                  }))}
                ></ha-select>
              </ha-md-list-item>
              ${data.time_option === BackupScheduleTime.CUSTOM
                ? html`<ha-expansion-panel
                    expanded
                    .header=${this.hass.localize(
                      "ui.panel.config.backup.schedule.custom_time"
                    )}
                    outlined
                  >
                    <ha-md-list-item>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.backup.schedule.custom_time_label"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.backup.schedule.custom_time_description",
                          {
                            time: formatTime(
                              DEFAULT_OPTIMIZED_BACKUP_START_TIME,
                              this.hass.locale,
                              this.hass.config
                            ),
                          }
                        )}
                      </span>
                      <ha-time-input
                        slot="end"
                        @value-changed=${this._timeChanged}
                        .value=${data.time ?? undefined}
                        .locale=${this.hass.locale}
                      >
                      </ha-time-input>
                    </ha-md-list-item>
                  </ha-expansion-panel>`
                : nothing}
            `
          : nothing}
        ${this.supervisor
          ? html`
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.backup.schedule.update_preference.label`
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    `ui.panel.config.backup.schedule.update_preference.supporting_text`
                  )}
                </span>
                <ha-select
                  slot="end"
                  @selected=${this._updatePreferenceChanged}
                  .value=${this.supervisorUpdateConfig?.core_backup_before_update?.toString() ||
                  "false"}
                  .options=${[
                    {
                      value: "false",
                      label: this.hass.localize(
                        `ui.panel.config.backup.schedule.update_preference.skip_backups`
                      ),
                    },
                    {
                      value: "true",
                      label: this.hass.localize(
                        `ui.panel.config.backup.schedule.update_preference.backup_before_update`
                      ),
                    },
                  ]}
                ></ha-select>
              </ha-md-list-item>
            `
          : nothing}

        <ha-backup-config-retention
          .hass=${this.hass}
          .retention=${data.retention}
          @value-changed=${this._retentionChanged}
        ></ha-backup-config-retention>
        <ha-tip .hass=${this.hass}
          >${this.hass.localize("ui.panel.config.backup.schedule.tip", {
            backup_create: html`<a
              href=${documentationUrl(
                this.hass,
                "/integrations/backup/#action-backupcreate_automatic"
              )}
              target="_blank"
              rel="noopener noreferrer"
              >backup.create_automatic</a
            >`,
          })}</ha-tip
        >
      </ha-md-list>
    `;
  }

  private _scheduleChanged(ev: ValueChangedEvent<BackupScheduleRecurrence>) {
    const value = ev.detail.value;
    const data = this._getData(this.value);
    let days = [...data.days];

    if (
      value === BackupScheduleRecurrence.CUSTOM_DAYS &&
      data.days.length === 0
    ) {
      days = [...BACKUP_DAYS];
    }

    this._setData({
      ...data,
      recurrence: value,
      days,
    });
  }

  private _scheduleTimeChanged(ev: ValueChangedEvent<BackupScheduleTime>) {
    const value = ev.detail.value;

    const data = this._getData(this.value);
    this._setData({
      ...data,
      time_option: value,
      time: value === BackupScheduleTime.CUSTOM ? "04:45:00" : undefined,
    });
  }

  private _timeChanged(ev) {
    ev.stopPropagation();
    const data = this._getData(this.value);

    this._setData({
      ...data,
      time: ev.detail.value,
    });
  }

  private _daysChanged(ev) {
    ev.stopPropagation();

    const target = ev.currentTarget as HaCheckbox;
    const value = target.value as BackupDay;
    const data = this._getData(this.value);
    const days = [...data.days];

    if (target.checked && !data.days.includes(value)) {
      days.push(value);
    } else if (!target.checked && data.days.includes(value)) {
      days.splice(days.indexOf(value), 1);
    }

    sortWeekdays(days);

    this._setData({
      ...data,
      days,
    });
  }

  private _updatePreferenceChanged(ev: ValueChangedEvent<"true" | "false">) {
    const core_backup_before_update = ev.detail.value === "true";
    fireEvent(this, "update-config-changed", {
      value: {
        core_backup_before_update,
      },
    });
  }

  private _retentionChanged(ev: ValueChangedEvent<Retention>) {
    ev.stopPropagation();
    const retention = ev.detail.value;

    const data = this._getData(this.value);

    const newData = {
      ...data,
      retention,
    };

    this._setData(newData);
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item {
      --md-item-overflow: visible;
    }
    ha-select {
      min-width: 210px;
    }
    ha-time-input {
      min-width: 194px;
      --time-input-flex: 1;
    }
    @media all and (max-width: 450px) {
      ha-select {
        min-width: 160px;
        width: 160px;
      }
      ha-time-input {
        min-width: 145px;
        width: 145px;
      }
    }
    ha-expansion-panel {
      margin-bottom: 16px;
    }
    ha-tip {
      text-align: unset;
      margin: 16px 0;
    }
    ha-md-list-item.days {
      --md-item-align-items: flex-start;
    }
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-schedule": HaBackupConfigSchedule;
  }

  interface HASSDomEvents {
    "update-config-changed": {
      value: Partial<SupervisorUpdateConfig>;
    };
  }
}
