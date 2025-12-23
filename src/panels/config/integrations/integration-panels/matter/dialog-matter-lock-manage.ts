import {
  mdiAccountMultiple,
  mdiCalendarRange,
  mdiCalendarWeek,
  mdiDelete,
  mdiPartyPopper,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-button";
import "../../../../../components/ha-button-toggle-group";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-list";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import type {
  MatterLockInfo,
  MatterLockUser,
  MatterWeekDaySchedule,
  MatterYearDaySchedule,
  MatterHolidaySchedule,
} from "../../../../../data/matter-lock";
import {
  getMatterLockInfo,
  getMatterLockUsers,
  clearMatterLockUser,
  getMatterLockWeekDaySchedule,
  getMatterLockYearDaySchedule,
  getMatterLockHolidaySchedule,
} from "../../../../../data/matter-lock";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant, ToggleButton } from "../../../../../types";
import type { MatterLockManageDialogParams } from "./show-dialog-matter-lock-manage";
import { showMatterLockUserEditDialog } from "./show-dialog-matter-lock-user-edit";
import { showMatterLockWeekDayScheduleEditDialog } from "./show-dialog-matter-lock-week-day-schedule-edit";
import { showMatterLockYearDayScheduleEditDialog } from "./show-dialog-matter-lock-year-day-schedule-edit";
import { showMatterLockHolidayScheduleEditDialog } from "./show-dialog-matter-lock-holiday-schedule-edit";

type TabId = "users" | "week_day" | "year_day" | "holiday";

@customElement("dialog-matter-lock-manage")
class DialogMatterLockManage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _deviceId?: string;

  @state() private _lockInfo?: MatterLockInfo;

  @state() private _users: MatterLockUser[] = [];

  @state() private _weekDaySchedules: MatterWeekDaySchedule[] = [];

  @state() private _yearDaySchedules: MatterYearDaySchedule[] = [];

  @state() private _holidaySchedules: MatterHolidaySchedule[] = [];

  @state() private _loading = true;

  @state() private _activeTab: TabId = "users";

  public async showDialog(params: MatterLockManageDialogParams): Promise<void> {
    this._deviceId = params.device_id;
    this._loading = true;
    await this._fetchData();
  }

  private async _fetchData(): Promise<void> {
    if (!this._deviceId) {
      return;
    }

    try {
      this._lockInfo = await getMatterLockInfo(this.hass, this._deviceId);

      if (this._lockInfo.supports_user_management) {
        const usersResponse = await getMatterLockUsers(
          this.hass,
          this._deviceId
        );
        this._users = usersResponse.users;
      }

      // Load schedules for all users if supported
      if (this._lockInfo.supports_week_day_schedules) {
        await this._loadWeekDaySchedules();
      }
      if (this._lockInfo.supports_year_day_schedules) {
        await this._loadYearDaySchedules();
      }
      if (this._lockInfo.supports_holiday_schedules) {
        await this._loadHolidaySchedules();
      }
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.load_failed"
        ),
        text: (err as Error).message,
      });
    } finally {
      this._loading = false;
    }
  }

  private async _loadWeekDaySchedules(): Promise<void> {
    if (!this._deviceId || !this._lockInfo) return;

    const schedules: MatterWeekDaySchedule[] = [];
    for (const user of this._users.filter(
      (u) => u.user_status !== "available"
    )) {
      for (
        let i = 1;
        i <= this._lockInfo.max_week_day_schedules_per_user;
        i++
      ) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const schedule = await getMatterLockWeekDaySchedule(
            this.hass,
            this._deviceId,
            i,
            user.user_index
          );
          if (schedule.status === "occupied") {
            schedules.push(schedule);
          }
        } catch {
          // Schedule not found or error, continue
        }
      }
    }
    this._weekDaySchedules = schedules;
  }

  private async _loadYearDaySchedules(): Promise<void> {
    if (!this._deviceId || !this._lockInfo) return;

    const schedules: MatterYearDaySchedule[] = [];
    for (const user of this._users.filter(
      (u) => u.user_status !== "available"
    )) {
      for (
        let i = 1;
        i <= this._lockInfo.max_year_day_schedules_per_user;
        i++
      ) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const schedule = await getMatterLockYearDaySchedule(
            this.hass,
            this._deviceId,
            i,
            user.user_index
          );
          if (schedule.status === "occupied") {
            schedules.push(schedule);
          }
        } catch {
          // Schedule not found or error, continue
        }
      }
    }
    this._yearDaySchedules = schedules;
  }

  private async _loadHolidaySchedules(): Promise<void> {
    if (!this._deviceId || !this._lockInfo) return;

    const schedules: MatterHolidaySchedule[] = [];
    for (let i = 1; i <= this._lockInfo.max_holiday_schedules; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const schedule = await getMatterLockHolidaySchedule(
          this.hass,
          this._deviceId,
          i
        );
        if (schedule.status === "occupied") {
          schedules.push(schedule);
        }
      } catch {
        // Schedule not found or error, continue
      }
    }
    this._holidaySchedules = schedules;
  }

  private _getTabButtons(): ToggleButton[] {
    const buttons: ToggleButton[] = [];

    if (this._lockInfo?.supports_user_management) {
      buttons.push({
        label: this.hass.localize("ui.panel.config.matter.lock.tabs.users"),
        iconPath: mdiAccountMultiple,
        value: "users",
      });
    }

    if (this._lockInfo?.supports_week_day_schedules) {
      buttons.push({
        label: this.hass.localize(
          "ui.panel.config.matter.lock.tabs.week_day_schedules"
        ),
        iconPath: mdiCalendarWeek,
        value: "week_day",
      });
    }

    if (this._lockInfo?.supports_year_day_schedules) {
      buttons.push({
        label: this.hass.localize(
          "ui.panel.config.matter.lock.tabs.year_day_schedules"
        ),
        iconPath: mdiCalendarRange,
        value: "year_day",
      });
    }

    // Note: Some locks (e.g., Yale) report HDSCH support in feature map
    // but reject SetHolidaySchedule command. Only show if actually supported.
    if (
      this._lockInfo?.supports_holiday_schedules &&
      this._lockInfo?.max_holiday_schedules > 0
    ) {
      buttons.push({
        label: this.hass.localize(
          "ui.panel.config.matter.lock.tabs.holiday_schedules"
        ),
        iconPath: mdiPartyPopper,
        value: "holiday",
      });
    }

    return buttons;
  }

  protected render() {
    if (!this._deviceId) {
      return nothing;
    }

    const tabButtons = this._getTabButtons();

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.matter.lock.dialog_title")
        )}
      >
        ${this._loading
          ? html`<div class="center">
              <ha-spinner></ha-spinner>
            </div>`
          : html`
              ${tabButtons.length > 1
                ? html`
                    <div class="tab-bar">
                      <ha-button-toggle-group
                        .buttons=${tabButtons}
                        .active=${this._activeTab}
                        @value-changed=${this._handleTabChange}
                        full-width
                      ></ha-button-toggle-group>
                    </div>
                  `
                : nothing}

              <div class="content">${this._renderTabContent()}</div>
            `}
      </ha-dialog>
    `;
  }

  private _renderTabContent() {
    switch (this._activeTab) {
      case "users":
        return this._renderUsersTab();
      case "week_day":
        return this._renderWeekDaySchedulesTab();
      case "year_day":
        return this._renderYearDaySchedulesTab();
      case "holiday":
        return this._renderHolidaySchedulesTab();
      default:
        return nothing;
    }
  }

  private _renderUsersTab() {
    const occupiedUsers = this._users.filter(
      (u) => u.user_status !== "available"
    );

    return html`
      <div class="tab-content">
        ${occupiedUsers.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.users.no_users"
              )}
            </p>`
          : html`
              <ha-list>
                ${occupiedUsers.map(
                  (user) => html`
                    <ha-list-item
                      twoline
                      hasMeta
                      .user=${user}
                      @click=${this._handleUserClick}
                    >
                      <span
                        >${user.user_name || `User ${user.user_index}`}</span
                      >
                      <span slot="secondary">
                        ${this.hass.localize(
                          `ui.panel.config.matter.lock.users.user_type.${user.user_type}`
                        )}
                        ${user.credentials.length > 0
                          ? ` - ${user.credentials.length} ${this.hass.localize("ui.panel.config.matter.lock.users.credentials").toLowerCase()}`
                          : ""}
                      </span>
                      <ha-icon-button
                        slot="meta"
                        .path=${mdiDelete}
                        .user=${user}
                        @click=${this._handleDeleteUserClick}
                      ></ha-icon-button>
                    </ha-list-item>
                  `
                )}
              </ha-list>
            `}
        <div class="actions">
          <ha-button @click=${this._addUser}>
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.matter.lock.users.add")}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _renderWeekDaySchedulesTab() {
    return html`
      <div class="tab-content">
        ${this._weekDaySchedules.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.schedules.week_day.no_schedules"
              )}
            </p>`
          : html`
              <ha-list>
                ${this._weekDaySchedules.map((schedule) => {
                  const user = this._users.find(
                    (u) => u.user_index === schedule.user_index
                  );
                  return html`
                    <ha-list-item
                      twoline
                      hasMeta
                      .schedule=${schedule}
                      @click=${this._handleWeekDayScheduleClick}
                    >
                      <span>${schedule.days.join(", ")}</span>
                      <span slot="secondary">
                        ${user?.user_name || `User ${schedule.user_index}`} -
                        ${String(schedule.start_hour).padStart(
                          2,
                          "0"
                        )}:${String(schedule.start_minute).padStart(2, "0")}
                        -
                        ${String(schedule.end_hour).padStart(2, "0")}:${String(
                          schedule.end_minute
                        ).padStart(2, "0")}
                      </span>
                    </ha-list-item>
                  `;
                })}
              </ha-list>
            `}
        <div class="actions">
          <ha-button @click=${this._addWeekDaySchedule}>
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.week_day.add"
            )}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _renderYearDaySchedulesTab() {
    return html`
      <div class="tab-content">
        ${this._yearDaySchedules.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.schedules.year_day.no_schedules"
              )}
            </p>`
          : html`
              <ha-list>
                ${this._yearDaySchedules.map((schedule) => {
                  const user = this._users.find(
                    (u) => u.user_index === schedule.user_index
                  );
                  const startDate = new Date(schedule.local_start_time * 1000);
                  const endDate = new Date(schedule.local_end_time * 1000);
                  return html`
                    <ha-list-item
                      twoline
                      hasMeta
                      .schedule=${schedule}
                      @click=${this._handleYearDayScheduleClick}
                    >
                      <span
                        >${user?.user_name ||
                        `User ${schedule.user_index}`}</span
                      >
                      <span slot="secondary">
                        ${startDate.toLocaleDateString()} -
                        ${endDate.toLocaleDateString()}
                      </span>
                    </ha-list-item>
                  `;
                })}
              </ha-list>
            `}
        <div class="actions">
          <ha-button @click=${this._addYearDaySchedule}>
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.year_day.add"
            )}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _renderHolidaySchedulesTab() {
    return html`
      <div class="tab-content">
        ${this._holidaySchedules.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.schedules.holiday.no_schedules"
              )}
            </p>`
          : html`
              <ha-list>
                ${this._holidaySchedules.map((schedule) => {
                  const startDate = new Date(schedule.local_start_time * 1000);
                  const endDate = new Date(schedule.local_end_time * 1000);
                  return html`
                    <ha-list-item
                      twoline
                      hasMeta
                      .schedule=${schedule}
                      @click=${this._handleHolidayScheduleClick}
                    >
                      <span>
                        ${this.hass.localize(
                          `ui.panel.config.matter.lock.schedules.holiday.modes.${schedule.operating_mode}`
                        )}
                      </span>
                      <span slot="secondary">
                        ${startDate.toLocaleDateString()} -
                        ${endDate.toLocaleDateString()}
                      </span>
                    </ha-list-item>
                  `;
                })}
              </ha-list>
            `}
        <div class="actions">
          <ha-button @click=${this._addHolidaySchedule}>
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.matter.lock.schedules.holiday.add"
            )}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _handleTabChange(ev: CustomEvent): void {
    this._activeTab = ev.detail.value as TabId;
  }

  private _handleUserClick(ev: Event): void {
    const user = (ev.currentTarget as any).user as MatterLockUser;
    this._editUser(user);
  }

  private _handleDeleteUserClick(ev: Event): void {
    ev.stopPropagation();
    const user = (ev.currentTarget as any).user as MatterLockUser;
    this._deleteUser(user);
  }

  private _handleWeekDayScheduleClick(ev: Event): void {
    const schedule = (ev.currentTarget as any)
      .schedule as MatterWeekDaySchedule;
    this._editWeekDaySchedule(schedule);
  }

  private _handleYearDayScheduleClick(ev: Event): void {
    const schedule = (ev.currentTarget as any)
      .schedule as MatterYearDaySchedule;
    this._editYearDaySchedule(schedule);
  }

  private _handleHolidayScheduleClick(ev: Event): void {
    const schedule = (ev.currentTarget as any)
      .schedule as MatterHolidaySchedule;
    this._editHolidaySchedule(schedule);
  }

  private async _addUser(): Promise<void> {
    showMatterLockUserEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      onSaved: () => this._fetchData(),
    });
  }

  private async _editUser(user: MatterLockUser): Promise<void> {
    showMatterLockUserEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      user,
      onSaved: () => this._fetchData(),
    });
  }

  private async _deleteUser(user: MatterLockUser): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.matter.lock.users.delete"),
      text: this.hass.localize(
        "ui.panel.config.matter.lock.confirm_delete_user",
        {
          name: user.user_name || `User ${user.user_index}`,
        }
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearMatterLockUser(this.hass, this._deviceId!, user.user_index);
      await this._fetchData();
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    }
  }

  private async _addWeekDaySchedule(): Promise<void> {
    showMatterLockWeekDayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      users: this._users.filter((u) => u.user_status !== "available"),
      onSaved: () => this._fetchData(),
    });
  }

  private async _editWeekDaySchedule(
    schedule: MatterWeekDaySchedule
  ): Promise<void> {
    showMatterLockWeekDayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      users: this._users.filter((u) => u.user_status !== "available"),
      schedule,
      onSaved: () => this._fetchData(),
    });
  }

  private async _addYearDaySchedule(): Promise<void> {
    showMatterLockYearDayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      users: this._users.filter((u) => u.user_status !== "available"),
      onSaved: () => this._fetchData(),
    });
  }

  private async _editYearDaySchedule(
    schedule: MatterYearDaySchedule
  ): Promise<void> {
    showMatterLockYearDayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      users: this._users.filter((u) => u.user_status !== "available"),
      schedule,
      onSaved: () => this._fetchData(),
    });
  }

  private async _addHolidaySchedule(): Promise<void> {
    showMatterLockHolidayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      onSaved: () => this._fetchData(),
    });
  }

  private async _editHolidaySchedule(
    schedule: MatterHolidaySchedule
  ): Promise<void> {
    showMatterLockHolidayScheduleEditDialog(this, {
      device_id: this._deviceId!,
      lockInfo: this._lockInfo!,
      schedule,
      onSaved: () => this._fetchData(),
    });
  }

  public closeDialog(): void {
    this._deviceId = undefined;
    this._lockInfo = undefined;
    this._users = [];
    this._weekDaySchedules = [];
    this._yearDaySchedules = [];
    this._holidaySchedules = [];
    this._loading = true;
    this._activeTab = "users";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-list-side-padding: 24px;
          --mdc-list-side-padding-right: 16px;
        }
        .center {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .tab-bar {
          padding: 8px 24px;
          border-bottom: 1px solid var(--divider-color);
        }
        .content {
          min-height: 300px;
        }
        .tab-content {
          padding: 16px 0;
        }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: 24px;
        }
        .actions {
          padding: 8px 24px;
          display: flex;
          justify-content: flex-end;
        }
        ha-list-item {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-manage": DialogMatterLockManage;
  }
}
