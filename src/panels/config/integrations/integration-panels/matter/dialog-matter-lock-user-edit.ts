import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-checkbox";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-wa-dialog";
import {
  setMatterLockCredential,
  setMatterLockWeekDaySchedule,
  maskFromDays,
} from "../../../../../data/matter-lock";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockUserEditDialogParams } from "./show-dialog-matter-lock-user-edit";

// Simplified user types for better UX
interface SimpleUserType {
  value: string;
  label: string;
  description: string;
}

const SIMPLE_USER_TYPES: SimpleUserType[] = [
  {
    value: "unrestricted_user",
    label: "Full access",
    description: "Can lock/unlock anytime, 24/7",
  },
  {
    value: "disposable_user",
    label: "One-time access",
    description: "Code works once, then is deleted",
  },
  {
    value: "week_day_schedule_user",
    label: "Scheduled access",
    description: "Access only during scheduled times",
  },
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
];

@customElement("dialog-matter-lock-user-edit")
class DialogMatterLockUserEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockUserEditDialogParams;

  @state() private _userName = "";

  @state() private _userType = "unrestricted_user";

  @state() private _pinCode = "";

  @state() private _saving = false;

  @state() private _error = "";

  @state() private _open = false;

  // Schedule fields
  @state() private _scheduleDays: string[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
  ];

  @state() private _scheduleStartTime = "09:00";

  @state() private _scheduleEndTime = "17:00";

  public async showDialog(
    params: MatterLockUserEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = "";
    this._pinCode = "";
    this._open = true;

    if (params.user) {
      this._userName = params.user.user_name || "";
      this._userType = this._mapUserType(params.user.user_type);
    } else {
      this._userName = "";
      this._userType = "unrestricted_user";
    }

    // Reset schedule to defaults
    this._scheduleDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    this._scheduleStartTime = "09:00";
    this._scheduleEndTime = "17:00";
  }

  private _mapUserType(type: string): string {
    // Map old frontend values to backend values if needed
    const mapping: Record<string, string> = {
      unrestricted: "unrestricted_user",
      disposable: "disposable_user",
      expiring: "expiring_user",
      year_day: "year_day_schedule_user",
      week_day: "week_day_schedule_user",
      programming: "programming_user",
      non_access: "non_access_user",
      forced: "forced_user",
      schedule_restricted_user: "week_day_schedule_user",
    };
    return mapping[type] || type;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.user;
    const title = isNew ? "Add user" : "Edit user";
    const minPin = this._params.lockInfo?.min_pin_length || 4;
    const maxPin = this._params.lockInfo?.max_pin_length || 8;
    const showSchedule = this._userType === "week_day_schedule_user";
    const supportsSchedules =
      this._params.lockInfo?.supports_week_day_schedules;

    // Filter user types based on lock capabilities
    const availableUserTypes = SIMPLE_USER_TYPES.filter(
      (type) => type.value !== "week_day_schedule_user" || supportsSchedules
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <div class="form">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}

          <ha-textfield
            label="Name"
            .value=${this._userName}
            @input=${this._handleNameChange}
            placeholder="e.g., John, Cleaning Service"
            maxlength="10"
          ></ha-textfield>

          ${isNew
            ? html`
                <ha-textfield
                  label="PIN code"
                  .value=${this._pinCode}
                  @input=${this._handlePinChange}
                  type="password"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter ${minPin}-${maxPin} digit code"
                  minlength=${minPin}
                  maxlength=${maxPin}
                  required
                ></ha-textfield>
                <p class="hint">
                  PIN must be ${minPin}-${maxPin} digits. This is the code used
                  to unlock.
                </p>
              `
            : nothing}

          <div class="user-type-section">
            <label>Access type</label>
            ${availableUserTypes.map(
              (type) => html`
                <div
                  class="user-type-option ${this._userType === type.value
                    ? "selected"
                    : ""}"
                  .userType=${type.value}
                  @click=${this._handleUserTypeClick}
                >
                  <div class="user-type-label">${type.label}</div>
                  <div class="user-type-description">${type.description}</div>
                </div>
              `
            )}
          </div>

          ${showSchedule
            ? html`
                <div class="schedule-section">
                  <label>Schedule</label>

                  <div class="days-row">
                    ${DAYS_OF_WEEK.map(
                      (day) => html`
                        <div
                          class="day-chip ${this._scheduleDays.includes(
                            day.value
                          )
                            ? "selected"
                            : ""}"
                          .day=${day.value}
                          @click=${this._handleDayClick}
                        >
                          ${day.label}
                        </div>
                      `
                    )}
                  </div>

                  <div class="time-row">
                    <ha-textfield
                      label="Start time"
                      type="time"
                      .value=${this._scheduleStartTime}
                      @change=${this._handleStartTimeChange}
                    ></ha-textfield>
                    <span class="time-separator">to</span>
                    <ha-textfield
                      label="End time"
                      type="time"
                      .value=${this._scheduleEndTime}
                      @change=${this._handleEndTimeChange}
                    ></ha-textfield>
                  </div>

                  <p class="hint">
                    User can only unlock during these times. Outside this
                    schedule, their code won't work.
                  </p>
                </div>
              `
            : nothing}
        </div>

        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            Cancel
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._save}
            .disabled=${this._saving}
          >
            ${this._saving ? "Saving..." : isNew ? "Add user" : "Save"}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _handleNameChange(ev: InputEvent): void {
    this._userName = (ev.target as HTMLInputElement).value;
  }

  private _handlePinChange(ev: InputEvent): void {
    // Only allow digits
    const value = (ev.target as HTMLInputElement).value.replace(/\D/g, "");
    this._pinCode = value;
    (ev.target as HTMLInputElement).value = value;
  }

  private _handleUserTypeClick(ev: Event): void {
    const type = (ev.currentTarget as any).userType as string;
    this._userType = type;
  }

  private _handleDayClick(ev: Event): void {
    const day = (ev.currentTarget as any).day as string;
    if (this._scheduleDays.includes(day)) {
      this._scheduleDays = this._scheduleDays.filter((d) => d !== day);
    } else {
      this._scheduleDays = [...this._scheduleDays, day];
    }
  }

  private _handleStartTimeChange(ev: Event): void {
    this._scheduleStartTime = (ev.target as HTMLInputElement).value;
  }

  private _handleEndTimeChange(ev: Event): void {
    this._scheduleEndTime = (ev.target as HTMLInputElement).value;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._userName = "";
    this._userType = "unrestricted_user";
    this._pinCode = "";
    this._saving = false;
    this._error = "";
    this._scheduleDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ];
    this._scheduleStartTime = "09:00";
    this._scheduleEndTime = "17:00";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._error = "";
    const isNew = !this._params.user;
    const minPin = this._params.lockInfo?.min_pin_length || 4;
    const maxPin = this._params.lockInfo?.max_pin_length || 8;
    const isScheduled = this._userType === "week_day_schedule_user";

    // Validation
    if (!this._userName.trim()) {
      this._error = "Please enter a name for this user.";
      return;
    }

    if (isNew) {
      if (!this._pinCode) {
        this._error = "Please enter a PIN code.";
        return;
      }

      if (this._pinCode.length < minPin || this._pinCode.length > maxPin) {
        this._error = `PIN code must be ${minPin}-${maxPin} digits.`;
        return;
      }

      if (!/^\d+$/.test(this._pinCode)) {
        this._error = "PIN code must contain only numbers.";
        return;
      }
    }

    // Schedule validation
    if (isScheduled) {
      if (this._scheduleDays.length === 0) {
        this._error = "Please select at least one day for the schedule.";
        return;
      }

      if (!this._scheduleStartTime || !this._scheduleEndTime) {
        this._error = "Please set both start and end times.";
        return;
      }

      const [startHour, startMin] = this._scheduleStartTime
        .split(":")
        .map(Number);
      const [endHour, endMin] = this._scheduleEndTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        this._error = "End time must be after start time.";
        return;
      }
    }

    this._saving = true;

    try {
      let userIndex: number | undefined;

      if (isNew) {
        // For new users, use set_credential which creates user and credential together
        const result = await setMatterLockCredential(
          this.hass,
          this._params.device_id,
          {
            user_index: null as unknown as number, // Will auto-assign
            credential_type: "pin",
            credential_index: null,
            credential_data: this._pinCode,
            user_name: this._userName.trim(),
            user_type: this._userType,
          }
        );
        userIndex = result?.user_index;
      } else {
        // For existing users, update via WebSocket
        await this.hass.callWS({
          type: "matter/lock/set_user",
          device_id: this._params.device_id,
          user_index: this._params.user!.user_index,
          user_name: this._userName.trim(),
          user_type: this._userType,
          user_status: "occupied_enabled",
          credential_rule: "single",
        });
        userIndex = this._params.user!.user_index;
      }

      // Create schedule if this is a scheduled user
      if (isScheduled && userIndex) {
        const [startHour, startMinute] = this._scheduleStartTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = this._scheduleEndTime
          .split(":")
          .map(Number);

        await setMatterLockWeekDaySchedule(this.hass, this._params.device_id, {
          week_day_index: 1, // Use first schedule slot
          user_index: userIndex,
          days_mask: maskFromDays(this._scheduleDays),
          start_hour: startHour,
          start_minute: startMinute,
          end_hour: endHour,
          end_minute: endMinute,
        });
      }

      this._params.onSaved();
      this.closeDialog();
    } catch (err: unknown) {
      this._error = (err as Error).message || "Failed to save user.";
    } finally {
      this._saving = false;
    }
  }

  public closeDialog(): void {
    this._open = false;
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

        .hint {
          margin: calc(-1 * var(--ha-space-2)) 0 0 0;
          font-size: var(--ha-font-size-s, 12px);
          color: var(--secondary-text-color);
        }

        .user-type-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-2);
        }

        .user-type-section > label,
        .schedule-section > label {
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .user-type-option {
          padding: var(--ha-space-3) var(--ha-space-4);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-type-option:hover {
          background: var(--secondary-background-color);
        }

        .user-type-option.selected {
          border-color: var(--primary-color);
          background: rgba(var(--rgb-primary-color), 0.1);
        }

        .user-type-label {
          font-weight: 500;
          color: var(--primary-text-color);
        }

        .user-type-description {
          font-size: var(--ha-font-size-s, 12px);
          color: var(--secondary-text-color);
          margin-top: 2px;
        }

        .schedule-section {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
          padding: var(--ha-space-4);
          background: var(--secondary-background-color);
          border-radius: var(--ha-border-radius-md);
        }

        .days-row {
          display: flex;
          gap: var(--ha-space-1-5, 6px);
          flex-wrap: wrap;
        }

        .day-chip {
          padding: var(--ha-space-2) var(--ha-space-3);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-pill);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
          user-select: none;
        }

        .day-chip:hover {
          background: var(--primary-background-color);
        }

        .day-chip.selected {
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-color: var(--primary-color);
        }

        .time-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
        }

        .time-row ha-textfield {
          flex: 1;
        }

        .time-separator {
          color: var(--secondary-text-color);
        }

        ha-alert {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-user-edit": DialogMatterLockUserEdit;
  }
}
