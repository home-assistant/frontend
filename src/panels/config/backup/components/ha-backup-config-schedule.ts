import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-switch";
import type { BackupConfig } from "../../../../data/backup";
import { BackupScheduleState } from "../../../../data/backup";
import type { HomeAssistant } from "../../../../types";

export type BackupConfigSchedule = Pick<BackupConfig, "schedule" | "retention">;

const DEFAULT_CONFIG: BackupConfigSchedule = {
  schedule: {
    state: BackupScheduleState.DAILY,
  },
  retention: {
    copies: 3,
  },
};
@customElement("ha-backup-config-schedule")
class HaBackupConfigSchedule extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private value?: BackupConfigSchedule;

  private get _value() {
    return this.value ?? DEFAULT_CONFIG;
  }

  protected render() {
    if (!this._value) {
      return nothing;
    }

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
            .checked=${this._value.schedule.state !== BackupScheduleState.NEVER}
          ></ha-switch>
        </ha-md-list-item>
        ${this._value.schedule.state !== BackupScheduleState.NEVER
          ? html`
              <ha-md-list-item>
                <span slot="headline">Schedule</span>
                <span slot="supporting-text">
                  How often you want to create a backup.
                </span>

                <ha-md-select
                  slot="end"
                  @change=${this._scheduleChanged}
                  .value=${this._value.schedule.state}
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
                  @change=${this._maxCopiesChanged}
                  .value=${this._value.retention.copies}
                >
                  <ha-md-select-option .value=${1}>
                    <div slot="headline">Latest 1 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${2}>
                    <div slot="headline">Latest 2 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${3}>
                    <div slot="headline">Latest 3 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${4}>
                    <div slot="headline">Latest 4 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${5}>
                    <div slot="headline">Latest 5 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${6}>
                    <div slot="headline">Latest 6 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${7}>
                    <div slot="headline">Latest 7 copies</div>
                  </ha-md-select-option>
                  <ha-md-select-option .value=${0}>
                    <div slot="headline">Forever</div>
                  </ha-md-select-option>
                </ha-md-select>
              </ha-md-list-item>
            `
          : nothing}
      </ha-md-list>
    `;
  }

  private _enabledChanged(ev) {
    this.value = {
      ...this._value,
      schedule: {
        state: ev.target.checked
          ? DEFAULT_CONFIG.schedule.state
          : BackupScheduleState.NEVER,
      },
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _scheduleChanged(ev) {
    if (!ev.target.value || ev.target.value === this._value?.schedule.state) {
      return;
    }
    this.value = {
      ...this._value,
      schedule: {
        ...this._value!.schedule,
        state: ev.target.value as BackupScheduleState,
      },
    };
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _maxCopiesChanged(ev) {
    if (!ev.target.value || ev.target.value === this._value?.retention.copies) {
      return;
    }
    this.value = {
      ...this._value,
      retention: {
        ...this._value!.retention,
        copies: ev.target.value,
      },
    };
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-schedule": HaBackupConfigSchedule;
  }
}
