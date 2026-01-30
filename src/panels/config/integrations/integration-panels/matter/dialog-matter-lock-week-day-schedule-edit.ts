import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-checkbox";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-wa-dialog";
import {
  maskFromDays,
  setMatterLockWeekDaySchedule,
} from "../../../../../data/matter-lock";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockWeekDayScheduleEditDialogParams } from "./show-dialog-matter-lock-week-day-schedule-edit";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

@customElement("dialog-matter-lock-week-day-schedule-edit")
class DialogMatterLockWeekDayScheduleEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockWeekDayScheduleEditDialogParams;

  @state() private _userIndex = 0;

  @state() private _selectedDays: string[] = [];

  @state() private _startHour = 9;

  @state() private _startMinute = 0;

  @state() private _endHour = 17;

  @state() private _endMinute = 0;

  @state() private _saving = false;

  @state() private _open = false;

  public async showDialog(
    params: MatterLockWeekDayScheduleEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._open = true;

    if (params.schedule) {
      this._userIndex = params.schedule.user_index;
      this._selectedDays = [...params.schedule.days];
      this._startHour = params.schedule.start_hour;
      this._startMinute = params.schedule.start_minute;
      this._endHour = params.schedule.end_hour;
      this._endMinute = params.schedule.end_minute;
    } else {
      this._userIndex = params.users[0]?.user_index || 0;
      this._selectedDays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ];
      this._startHour = 9;
      this._startMinute = 0;
      this._endHour = 17;
      this._endMinute = 0;
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.schedule;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.schedules.week_day.add")
      : this.hass.localize(
          "ui.panel.config.matter.lock.schedules.week_day.edit"
        );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <div class="form">
          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.week_day.user"
            )}
            .value=${String(this._userIndex)}
            @selected=${this._handleUserChange}
            .disabled=${!isNew}
          >
            ${this._params.users.map(
              (user) => html`
                <ha-list-item .value=${String(user.user_index)}>
                  ${user.user_name || `User ${user.user_index}`}
                </ha-list-item>
              `
            )}
          </ha-select>

          <div class="days-section">
            <label
              >${this.hass.localize(
                "ui.panel.config.matter.lock.schedules.week_day.days"
              )}</label
            >
            <div class="days-grid">
              ${DAYS.map(
                (day) => html`
                  <label class="day-checkbox">
                    <ha-checkbox
                      .checked=${this._selectedDays.includes(day)}
                      .day=${day}
                      @change=${this._handleDayChange}
                    ></ha-checkbox>
                    ${this.hass.localize(
                      `ui.panel.config.matter.lock.schedules.week_day.day_names.${day}`
                    )}
                  </label>
                `
              )}
            </div>
          </div>

          <div class="time-section">
            <div class="time-row">
              <ha-textfield
                .label=${this.hass.localize(
                  "ui.panel.config.matter.lock.schedules.week_day.start_time"
                )}
                type="time"
                .value=${`${String(this._startHour).padStart(2, "0")}:${String(this._startMinute).padStart(2, "0")}`}
                @change=${this._handleStartTimeChange}
              ></ha-textfield>
            </div>
            <div class="time-row">
              <ha-textfield
                .label=${this.hass.localize(
                  "ui.panel.config.matter.lock.schedules.week_day.end_time"
                )}
                type="time"
                .value=${`${String(this._endHour).padStart(2, "0")}:${String(this._endMinute).padStart(2, "0")}`}
                @change=${this._handleEndTimeChange}
              ></ha-textfield>
            </div>
          </div>
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._saving || !this._isValid()}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _isValid(): boolean {
    if (this._selectedDays.length === 0) {
      return false;
    }

    const startMinutes = this._startHour * 60 + this._startMinute;
    const endMinutes = this._endHour * 60 + this._endMinute;
    return endMinutes > startMinutes;
  }

  private _handleUserChange(ev: CustomEvent): void {
    this._userIndex = parseInt(ev.detail.value, 10);
  }

  private _handleDayChange(ev: Event): void {
    const day = (ev.currentTarget as any).day as string;
    this._toggleDay(day);
  }

  private _toggleDay(day: string): void {
    if (this._selectedDays.includes(day)) {
      this._selectedDays = this._selectedDays.filter((d) => d !== day);
    } else {
      this._selectedDays = [...this._selectedDays, day];
    }
  }

  private _handleStartTimeChange(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    const [hour, minute] = value.split(":").map(Number);
    this._startHour = hour;
    this._startMinute = minute;
  }

  private _handleEndTimeChange(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    const [hour, minute] = value.split(":").map(Number);
    this._endHour = hour;
    this._endMinute = minute;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._saving = true;

    try {
      // Find next available schedule index for new schedules
      const weekDayIndex = this._params.schedule?.week_day_index || 1;

      await setMatterLockWeekDaySchedule(this.hass, this._params.device_id, {
        week_day_index: weekDayIndex,
        user_index: this._userIndex,
        days_mask: maskFromDays(this._selectedDays),
        start_hour: this._startHour,
        start_minute: this._startMinute,
        end_hour: this._endHour,
        end_minute: this._endMinute,
      });

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    } finally {
      this._saving = false;
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._userIndex = 0;
    this._selectedDays = [];
    this._startHour = 9;
    this._startMinute = 0;
    this._endHour = 17;
    this._endMinute = 0;
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .form {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
        }
        .days-section label {
          display: block;
          margin-bottom: var(--ha-space-2);
          font-weight: 500;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--ha-space-2);
        }
        .day-checkbox {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          cursor: pointer;
        }
        .time-section {
          display: flex;
          gap: var(--ha-space-4);
        }
        .time-row {
          flex: 1;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-week-day-schedule-edit": DialogMatterLockWeekDayScheduleEdit;
  }
}
