import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { clamp } from "../../../../../common/number/clamp";
import type { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../../components/ha-md-select";
import "../../../../../components/ha-md-select-option";
import "../../../../../components/ha-md-textfield";
import "../../../../../components/ha-switch";
import type { BackupConfig } from "../../../../../data/backup";
import {
  BackupScheduleState,
  getFormattedBackupTime,
} from "../../../../../data/backup";
import type { HomeAssistant } from "../../../../../types";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

const MIN_VALUE = 1;
const MAX_VALUE = 50;

enum RetentionPreset {
  COPIES_3 = "copies_3",
  FOREVER = "forever",
  CUSTOM = "custom",
}

interface RetentionData {
  type: "copies" | "days";
  value: number;
}

const RETENTION_PRESETS: Record<
  Exclude<RetentionPreset, RetentionPreset.CUSTOM>,
  RetentionData
> = {
  copies_3: { type: "copies", value: 3 },
  forever: { type: "days", value: 0 },
};

const SCHEDULE_OPTIONS = [
  BackupScheduleState.DAILY,
  BackupScheduleState.MONDAY,
  BackupScheduleState.TUESDAY,
  BackupScheduleState.WEDNESDAY,
  BackupScheduleState.THURSDAY,
  BackupScheduleState.FRIDAY,
  BackupScheduleState.SATURDAY,
  BackupScheduleState.SUNDAY,
] as const satisfies BackupScheduleState[];

const RETENTION_PRESETS_OPTIONS = [
  RetentionPreset.COPIES_3,
  RetentionPreset.FOREVER,
  RetentionPreset.CUSTOM,
] as const satisfies RetentionPreset[];

const computeRetentionPreset = (
  data: RetentionData
): RetentionPreset | undefined => {
  for (const [key, value] of Object.entries(RETENTION_PRESETS)) {
    if (value.type === data.type && value.value === data.value) {
      return key as RetentionPreset;
    }
  }
  return RetentionPreset.CUSTOM;
};

interface FormData {
  enabled: boolean;
  schedule: BackupScheduleState;
  retention: {
    type: "copies" | "days";
    value: number;
  };
}

const INITIAL_FORM_DATA: FormData = {
  enabled: false,
  schedule: BackupScheduleState.NEVER,
  retention: {
    type: "copies",
    value: 3,
  },
};

@customElement("ha-backup-config-schedule")
class HaBackupConfigSchedule extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: BackupConfigSchedule;

  @state() private _retentionPreset?: RetentionPreset;

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("value")) {
      if (this._retentionPreset !== RetentionPreset.CUSTOM) {
        const data = this._getData(this.value);
        this._retentionPreset = computeRetentionPreset(data.retention);
      }
    }
  }

  private _getData = memoizeOne((value?: BackupConfigSchedule): FormData => {
    if (!value) {
      return INITIAL_FORM_DATA;
    }

    const config = value;

    return {
      enabled: config.schedule.state !== BackupScheduleState.NEVER,
      schedule: config.schedule.state,
      retention: {
        type: config.retention.days != null ? "days" : "copies",
        value: config.retention.days ?? config.retention.copies ?? 3,
      },
    };
  });

  private _setData(data: FormData) {
    this.value = {
      schedule: {
        state: data.enabled ? data.schedule : BackupScheduleState.NEVER,
      },
      retention:
        data.retention.type === "days"
          ? { days: data.retention.value, copies: null }
          : { copies: data.retention.value, days: null },
    };

    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render() {
    const data = this._getData(this.value);

    const time = getFormattedBackupTime(this.hass.locale, this.hass.config);

    return html`
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">
            ${this.hass.localize(
              "ui.panel.config.backup.schedule.use_automatic_backups"
            )}
          </span>

          <ha-switch
            slot="end"
            @change=${this._enabledChanged}
            .checked=${data.enabled}
          ></ha-switch>
        </ha-md-list-item>
        ${data.enabled
          ? html`
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.schedule"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.backup.schedule.schedule_description"
                  )}
                </span>

                <ha-md-select
                  slot="end"
                  @change=${this._scheduleChanged}
                  .value=${data.schedule}
                >
                  ${SCHEDULE_OPTIONS.map(
                    (option) => html`
                      <ha-md-select-option .value=${option}>
                        <div slot="headline">
                          ${this.hass.localize(
                            `ui.panel.config.backup.schedule.schedule_options.${option}`,
                            { time }
                          )}
                        </div>
                      </ha-md-select-option>
                    `
                  )}
                </ha-md-select>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">
                  ${this.hass.localize(
                    `ui.panel.config.backup.schedule.retention`
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    `ui.panel.config.backup.schedule.retention_description`
                  )}
                </span>
                <ha-md-select
                  slot="end"
                  @change=${this._retentionPresetChanged}
                  .value=${this._retentionPreset}
                >
                  ${RETENTION_PRESETS_OPTIONS.map(
                    (option) => html`
                      <ha-md-select-option .value=${option}>
                        <div slot="headline">
                          ${this.hass.localize(
                            `ui.panel.config.backup.schedule.retention_presets.${option}`
                          )}
                        </div>
                      </ha-md-select-option>
                    `
                  )}
                </ha-md-select>
              </ha-md-list-item>
              ${this._retentionPreset === RetentionPreset.CUSTOM
                ? html`
                    <ha-md-list-item>
                      <ha-md-textfield
                        slot="end"
                        @change=${this._retentionValueChanged}
                        .value=${data.retention.value}
                        id="value"
                        type="number"
                        .min=${MIN_VALUE}
                        .max=${MAX_VALUE}
                        step="1"
                      >
                      </ha-md-textfield>
                      <ha-md-select
                        slot="end"
                        @change=${this._retentionTypeChanged}
                        .value=${data.retention.type}
                        id="type"
                      >
                        <ha-md-select-option value="days">
                          <div slot="headline">
                            ${this.hass.localize(
                              "ui.panel.config.backup.schedule.retention_units.days"
                            )}
                          </div>
                        </ha-md-select-option>
                        <ha-md-select-option value="copies">
                          ${this.hass.localize(
                            "ui.panel.config.backup.schedule.retention_units.copies"
                          )}
                        </ha-md-select-option>
                      </ha-md-select>
                    </ha-md-list-item>
                  `
                : nothing}
            `
          : nothing}
      </ha-md-list>
    `;
  }

  private _enabledChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaCheckbox;
    const data = this._getData(this.value);
    this._setData({
      ...data,
      enabled: target.checked,
      schedule: target.checked
        ? BackupScheduleState.DAILY
        : BackupScheduleState.NEVER,
    });
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _scheduleChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const data = this._getData(this.value);
    this._setData({
      ...data,
      schedule: target.value as BackupScheduleState,
    });
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _retentionPresetChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = target.value as RetentionPreset;

    this._retentionPreset = value;
    if (value !== RetentionPreset.CUSTOM) {
      const data = this._getData(this.value);
      const retention = RETENTION_PRESETS[value];
      // Ensure we have at least 1 in default value because user can't select 0
      if (value !== RetentionPreset.FOREVER) {
        retention.value = Math.max(retention.value, 1);
      }
      this._setData({
        ...data,
        retention: RETENTION_PRESETS[value],
      });
    }

    fireEvent(this, "value-changed", { value: this.value });
  }

  private _retentionValueChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = parseInt(target.value);
    const clamped = clamp(value, MIN_VALUE, MAX_VALUE);
    const data = this._getData(this.value);
    this._setData({
      ...data,
      retention: {
        ...data.retention,
        value: clamped,
      },
    });

    fireEvent(this, "value-changed", { value: this.value });
  }

  private _retentionTypeChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = target.value as "copies" | "days";

    const data = this._getData(this.value);
    this._setData({
      ...data,
      retention: {
        ...data.retention,
        type: value,
      },
    });

    fireEvent(this, "value-changed", { value: this.value });
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
    ha-md-select {
      min-width: 210px;
    }
    @media all and (max-width: 450px) {
      ha-md-select {
        min-width: 160px;
      }
    }
    ha-md-textfield#value {
      min-width: 70px;
    }
    ha-md-select#type {
      min-width: 100px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-schedule": HaBackupConfigSchedule;
  }
}
