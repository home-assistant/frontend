import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-switch";
import type { BackupConfig } from "../../../../data/backup";
import { BackupScheduleState } from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

enum RetentionPreset {
  COPIES_3 = "copies_3",
  DAYS_7 = "days_7",
  FOREOVER = "forever",
  CUSTOM = "custom",
}

type RetentionData = {
  type: "copies" | "days";
  value: number;
};

const RETENTION_PRESETS: Record<
  Exclude<RetentionPreset, RetentionPreset.CUSTOM>,
  RetentionData
> = {
  copies_3: { type: "copies", value: 3 },
  days_7: { type: "days", value: 7 },
  forever: { type: "days", value: 0 },
};

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

type FormData = {
  enabled: boolean;
  schedule: BackupScheduleState;
  retention: {
    type: "copies" | "days";
    value: number;
  };
};

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
        const data = this.getData(this.value);
        this._retentionPreset = computeRetentionPreset(data.retention);
      }
    }
  }

  private getData = memoizeOne((value?: BackupConfigSchedule): FormData => {
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

  private setData(data: FormData) {
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
    const data = this.getData(this.value);

    return html`
      <ha-md-list>
        <ha-md-list-item>
          <span slot="headline">Use automatic backups</span>
          <span slot="supporting-text">
            How often you want to create a backup.
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
                <span slot="headline">Schedule</span>
                <span slot="supporting-text">
                  How often you want to create a backup.
                </span>

                <ha-md-select
                  slot="end"
                  @change=${this._scheduleChanged}
                  .value=${data.schedule}
                >
                  <ha-md-select-option .value=${BackupScheduleState.DAILY}>
                    <div slot="headline">Daily at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.MONDAY}>
                    <div slot="headline">Monday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.TUESDAY}>
                    <div slot="headline">Tuesday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.WEDNESDAY}>
                    <div slot="headline">Wednesday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.THURSDAY}>
                    <div slot="headline">Thursday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.FRIDAY}>
                    <div slot="headline">Friday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.SATURDAY}>
                    <div slot="headline">Saturday at 04:45</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${BackupScheduleState.SUNDAY}>
                    <div slot="headline">Sunday at 04:45</div>
                  </ha-md-select-option>
                </ha-md-select>
              </ha-md-list-item>
              <ha-md-list-item>
                <span slot="headline">Maximum copies</span>
                <span slot="supporting-text">
                  The number of backups that are saved
                </span>
                <ha-md-select
                  slot="end"
                  @change=${this._retentionPresetChanged}
                  .value=${this._retentionPreset}
                >
                  <ha-md-select-option .value=${RetentionPreset.COPIES_3}>
                    <div slot="headline">Latest 3 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${RetentionPreset.DAYS_7}>
                    <div slot="headline">Keep 7 days</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${RetentionPreset.FOREOVER}>
                    <div slot="headline">Keep forever</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${RetentionPreset.CUSTOM}>
                    <div slot="headline">Custom</div>
                  </ha-md-select-option>
                </ha-md-select>
              </ha-md-list-item>
              ${this._retentionPreset === RetentionPreset.CUSTOM
                ? html`
                    <ha-md-list-item>
                      <ha-md-select
                        slot="end"
                        @change=${this._retentionValueChanged}
                        .value=${data.retention.value}
                        id="value"
                      >
                        ${Array(99)
                          .fill(0)
                          .map(
                            (_, i) => html`
                              <ha-md-select-option .value=${i + 1}>
                                <div slot="headline">${i + 1}</div>
                              </ha-md-select-option>
                            `
                          )}
                      </ha-md-select>
                      <ha-md-select
                        slot="end"
                        @change=${this._retentionTypeChanged}
                        .value=${data.retention.type}
                        id="type"
                      >
                        <ha-md-select-option .value=${"days"}>
                          <div slot="headline">days</div>
                        </ha-md-select-option>
                        <ha-md-select-option .value=${"copies"}>
                          <div slot="headline">copies</div>
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
    const data = this.getData(this.value);
    this.setData({
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
    const data = this.getData(this.value);
    this.setData({
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
      const data = this.getData(this.value);
      const retention = RETENTION_PRESETS[value];
      // Ensure we have at least 1 in defaut value because user can't select 0
      retention.value = Math.max(retention.value, 1);
      this.setData({
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

    const data = this.getData(this.value);
    this.setData({
      ...data,
      retention: {
        ...data.retention,
        value: value,
      },
    });

    fireEvent(this, "value-changed", { value: this.value });
  }

  private _retentionTypeChanged(ev) {
    ev.stopPropagation();
    const target = ev.currentTarget as HaMdSelect;
    const value = target.value as "copies" | "days";

    const data = this.getData(this.value);
    this.setData({
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
    ha-md-select {
      min-width: 210px;
    }
    @media all and (max-width: 450px) {
      ha-md-select {
        min-width: 160px;
        width: 160px;
      }
    }
    ha-md-select#value {
      min-width: 70px;
      width: 70px;
    }
    ha-md-select#type {
      min-width: 100px;
      width: 100px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-schedule": HaBackupConfigSchedule;
  }
}
