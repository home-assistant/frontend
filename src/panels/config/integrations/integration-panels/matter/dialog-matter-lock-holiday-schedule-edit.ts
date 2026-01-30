import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-wa-dialog";
import type { MatterHolidayOperatingMode } from "../../../../../data/matter-lock";
import { setMatterLockHolidaySchedule } from "../../../../../data/matter-lock";
import { showAlertDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockHolidayScheduleEditDialogParams } from "./show-dialog-matter-lock-holiday-schedule-edit";

const OPERATING_MODES: MatterHolidayOperatingMode[] = [
  "normal",
  "vacation",
  "privacy",
  "no_remote_lock_unlock",
  "passage",
];

@customElement("dialog-matter-lock-holiday-schedule-edit")
class DialogMatterLockHolidayScheduleEdit extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: MatterLockHolidayScheduleEditDialogParams;

  @state() private _startDateTime = "";

  @state() private _endDateTime = "";

  @state() private _operatingMode: MatterHolidayOperatingMode = "normal";

  @state() private _saving = false;

  @state() private _open = false;

  public async showDialog(
    params: MatterLockHolidayScheduleEditDialogParams
  ): Promise<void> {
    this._params = params;
    this._open = true;

    if (params.schedule) {
      this._startDateTime = this._epochToDateTimeLocal(
        params.schedule.local_start_time
      );
      this._endDateTime = this._epochToDateTimeLocal(
        params.schedule.local_end_time
      );
      this._operatingMode = params.schedule.operating_mode;
    } else {
      // Default to now and 7 days from now
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      this._startDateTime = this._dateToDateTimeLocal(now);
      this._endDateTime = this._dateToDateTimeLocal(weekLater);
      this._operatingMode = "normal";
    }
  }

  private _epochToDateTimeLocal(epoch: number): string {
    const date = new Date(epoch * 1000);
    return this._dateToDateTimeLocal(date);
  }

  private _dateToDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private _dateTimeLocalToEpoch(dateTimeLocal: string): number {
    const date = new Date(dateTimeLocal);
    return Math.floor(date.getTime() / 1000);
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const isNew = !this._params.schedule;
    const title = isNew
      ? this.hass.localize("ui.panel.config.matter.lock.schedules.holiday.add")
      : this.hass.localize(
          "ui.panel.config.matter.lock.schedules.holiday.edit"
        );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <div class="form">
          <ha-textfield
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.holiday.start"
            )}
            type="datetime-local"
            .value=${this._startDateTime}
            @change=${this._handleStartChange}
          ></ha-textfield>

          <ha-textfield
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.holiday.end"
            )}
            type="datetime-local"
            .value=${this._endDateTime}
            @change=${this._handleEndChange}
          ></ha-textfield>

          <ha-select
            .label=${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.holiday.operating_mode"
            )}
            .value=${this._operatingMode}
            @selected=${this._handleModeChange}
            @closed=${stopPropagation}
          >
            ${OPERATING_MODES.map(
              (mode) => html`
                <ha-list-item .value=${mode}>
                  ${this.hass.localize(
                    `ui.panel.config.matter.lock.schedules.holiday.modes.${mode}`
                  )}
                </ha-list-item>
              `
            )}
          </ha-select>
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
    if (!this._startDateTime || !this._endDateTime) {
      return false;
    }

    const start = this._dateTimeLocalToEpoch(this._startDateTime);
    const end = this._dateTimeLocalToEpoch(this._endDateTime);
    return end > start;
  }

  private _handleStartChange(ev: Event): void {
    this._startDateTime = (ev.target as HTMLInputElement).value;
  }

  private _handleEndChange(ev: Event): void {
    this._endDateTime = (ev.target as HTMLInputElement).value;
  }

  private _handleModeChange(ev: CustomEvent): void {
    this._operatingMode = (ev.target as HTMLSelectElement)
      .value as MatterHolidayOperatingMode;
  }

  private async _save(): Promise<void> {
    if (!this._params) {
      return;
    }

    this._saving = true;

    try {
      const holidayIndex = this._params.schedule?.holiday_index || 1;

      await setMatterLockHolidaySchedule(this.hass, this._params.device_id, {
        holiday_index: holidayIndex,
        local_start_time: this._dateTimeLocalToEpoch(this._startDateTime),
        local_end_time: this._dateTimeLocalToEpoch(this._endDateTime),
        operating_mode: this._operatingMode,
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
    this._startDateTime = "";
    this._endDateTime = "";
    this._operatingMode = "normal";
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-holiday-schedule-edit": DialogMatterLockHolidayScheduleEdit;
  }
}
