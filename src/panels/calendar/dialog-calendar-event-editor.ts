import "@material/mwc-button";
import { mdiClose } from "@mdi/js";
import { formatInTimeZone, toDate } from "date-fns-tz";
import {
  addDays,
  addHours,
  addMilliseconds,
  differenceInMilliseconds,
  startOfHour,
} from "date-fns/esm";
import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import { isDate } from "../../common/string/is_date";
import "../../components/entity/ha-entity-picker";
import "../../components/ha-date-input";
import "../../components/ha-textarea";
import "../../components/ha-time-input";
import {
  CalendarEntityFeature,
  CalendarEventMutableParams,
  createCalendarEvent,
  deleteCalendarEvent,
  RecurrenceRange,
  updateCalendarEvent,
} from "../../data/calendar";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import "./ha-recurrence-rule-editor";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";
import { CalendarEventEditDialogParams } from "./show-dialog-calendar-event-editor";
import { TimeZone } from "../../data/translation";

const CALENDAR_DOMAINS = ["calendar"];

@customElement("dialog-calendar-event-editor")
class DialogCalendarEventEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _info?: string;

  @state() private _params?: CalendarEventEditDialogParams;

  @state() private _calendarId?: string;

  @state() private _summary = "";

  @state() private _description? = "";

  @state() private _rrule?: string;

  @state() private _allDay = false;

  @state() private _dtstart?: Date; // In sync with _data.dtstart

  @state() private _dtend?: Date; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  // Dates are manipulated and displayed in the browser timezone
  // which may be different from the Home Assistant timezone. When
  // events are persisted, they are relative to the Home Assistant
  // timezone, but floating without a timezone.
  private _timeZone?: string;

  public showDialog(params: CalendarEventEditDialogParams): void {
    this._error = undefined;
    this._info = undefined;
    this._params = params;
    this._calendarId =
      params.calendarId ||
      Object.values(this.hass.states).find(
        (stateObj) =>
          computeStateDomain(stateObj) === "calendar" &&
          supportsFeature(stateObj, CalendarEntityFeature.CREATE_EVENT)
      )?.entity_id;
    this._timeZone =
      this.hass.locale.time_zone === TimeZone.local
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : this.hass.config.time_zone;
    if (params.entry) {
      const entry = params.entry!;
      this._allDay = isDate(entry.dtstart);
      this._summary = entry.summary;
      this._description = entry.description;
      this._rrule = entry.rrule;
      if (this._allDay) {
        this._dtstart = new Date(entry.dtstart + "T00:00:00");
        // Calendar event end dates are exclusive, but not shown that way in the UI. The
        // reverse happens when persisting the event.
        this._dtend = addDays(new Date(entry.dtend + "T00:00:00"), -1);
      } else {
        this._dtstart = new Date(entry.dtstart);
        this._dtend = new Date(entry.dtend);
      }
    } else {
      this._allDay = false;
      // If we have been provided a selected date (e.g. based on the currently displayed
      // day in a calendar view), use that as the starting value.
      this._dtstart = startOfHour(
        params.selectedDate ? params.selectedDate : new Date()
      );
      this._dtend = addHours(this._dtstart, 1);
    }
  }

  public closeDialog(): void {
    if (!this._params) {
      return;
    }
    this._calendarId = undefined;
    this._params = undefined;
    this._dtstart = undefined;
    this._dtend = undefined;
    this._summary = "";
    this._description = "";
    this._rrule = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const isCreate = this._params.entry === undefined;

    const { startDate, startTime, endDate, endTime } = this._getLocaleStrings(
      this._dtstart,
      this._dtend
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${html`
          <div class="header_title">
            ${isCreate
              ? this.hass.localize("ui.components.calendar.event.add")
              : this._summary}
          </div>
          <ha-icon-button
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            dialogAction="close"
            class="header_button"
          ></ha-icon-button>
        `}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${this._info
            ? html`<ha-alert
                alert-type="info"
                dismissable
                @alert-dismissed-clicked=${this._clearInfo}
                >${this._info}</ha-alert
              >`
            : ""}

          <ha-textfield
            class="summary"
            name="summary"
            .label=${this.hass.localize("ui.components.calendar.event.summary")}
            .value=${this._summary}
            required
            @change=${this._handleSummaryChanged}
            .validationMessage=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></ha-textfield>
          <ha-textarea
            class="description"
            name="description"
            .label=${this.hass.localize(
              "ui.components.calendar.event.description"
            )}
            .value=${this._description}
            @change=${this._handleDescriptionChanged}
            autogrow
          ></ha-textarea>
          <ha-entity-picker
            name="calendar"
            .hass=${this.hass}
            .label=${this.hass.localize("ui.components.calendar.label")}
            .value=${this._calendarId!}
            .includeDomains=${CALENDAR_DOMAINS}
            .entityFilter=${this._isEditableCalendar}
            .disabled=${!isCreate}
            required
            @value-changed=${this._handleCalendarChanged}
          ></ha-entity-picker>
          <ha-formfield
            .label=${this.hass.localize("ui.components.calendar.event.all_day")}
          >
            <ha-switch
              id="all_day"
              .checked=${this._allDay}
              @change=${this._allDayToggleChanged}
            ></ha-switch>
          </ha-formfield>

          <div>
            <span class="label"
              >${this.hass.localize(
                "ui.components.calendar.event.start"
              )}:</span
            >
            <div class="flex">
              <ha-date-input
                .value=${startDate}
                .locale=${this.hass.locale}
                @value-changed=${this._startDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${startTime}
                    .locale=${this.hass.locale}
                    @value-changed=${this._startTimeChanged}
                  ></ha-time-input>`
                : ""}
            </div>
          </div>
          <div>
            <span class="label"
              >${this.hass.localize("ui.components.calendar.event.end")}:</span
            >
            <div class="flex">
              <ha-date-input
                .value=${endDate}
                .min=${startDate}
                .locale=${this.hass.locale}
                @value-changed=${this._endDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${endTime}
                    .locale=${this.hass.locale}
                    @value-changed=${this._endTimeChanged}
                  ></ha-time-input>`
                : ""}
            </div>
          </div>
          <ha-recurrence-rule-editor
            .hass=${this.hass}
            .dtstart=${this._dtstart}
            .allDay=${this._allDay}
            .locale=${this.hass.locale}
            .timezone=${this.hass.config.time_zone}
            .value=${this._rrule || ""}
            @value-changed=${this._handleRRuleChanged}
          >
          </ha-recurrence-rule-editor>
        </div>
        ${isCreate
          ? html`
              <mwc-button
                slot="primaryAction"
                @click=${this._createEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.add")}
              </mwc-button>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                @click=${this._saveEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.save")}
              </mwc-button>
              ${this._params.canDelete
                ? html`
                    <mwc-button
                      slot="secondaryAction"
                      class="warning"
                      @click=${this._deleteEvent}
                      .disabled=${this._submitting}
                    >
                      ${this.hass.localize(
                        "ui.components.calendar.event.delete"
                      )}
                    </mwc-button>
                  `
                : ""}
            `}
      </ha-dialog>
    `;
  }

  private _isEditableCalendar = (entityStateObj: HassEntity) =>
    supportsFeature(entityStateObj, CalendarEntityFeature.CREATE_EVENT);

  private _getLocaleStrings = memoizeOne(
    (startDate?: Date, endDate?: Date) => ({
      startDate: this._formatDate(startDate!),
      startTime: this._formatTime(startDate!),
      endDate: this._formatDate(endDate!),
      endTime: this._formatTime(endDate!),
    })
  );

  // Formats a date in specified timezone, or defaulting to browser display timezone
  private _formatDate(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  }

  // Formats a time in specified timezone, or defaulting to browser display timezone
  private _formatTime(date: Date, timeZone: string = this._timeZone!): string {
    return formatInTimeZone(date, timeZone, "HH:mm:ss"); // 24 hr
  }

  // Parse a date in the browser timezone
  private _parseDate(dateStr: string): Date {
    return toDate(dateStr, { timeZone: this._timeZone! });
  }

  private _clearInfo() {
    this._info = undefined;
  }

  private _handleSummaryChanged(ev) {
    this._summary = ev.target.value;
  }

  private _handleDescriptionChanged(ev) {
    this._description = ev.target.value;
  }

  private _handleRRuleChanged(ev) {
    this._rrule = ev.detail.value;
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
  }

  private _startDateChanged(ev: CustomEvent) {
    // Store previous event duration
    const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

    this._dtstart = this._parseDate(
      `${ev.detail.value}T${this._formatTime(this._dtstart!)}`
    );

    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    if (this._dtend! <= this._dtstart!) {
      this._dtend = addMilliseconds(this._dtstart, duration);
      this._info = this.hass.localize(
        "ui.components.calendar.event.end_auto_adjusted"
      );
    }
  }

  private _endDateChanged(ev: CustomEvent) {
    this._dtend = this._parseDate(
      `${ev.detail.value}T${this._formatTime(this._dtend!)}`
    );
  }

  private _startTimeChanged(ev: CustomEvent) {
    // Store previous event duration
    const duration = differenceInMilliseconds(this._dtend!, this._dtstart!);

    this._dtstart = this._parseDate(
      `${this._formatDate(this._dtstart!)}T${ev.detail.value}`
    );

    // Prevent that the end time can be before the start time. Try to keep the
    // duration the same.
    if (this._dtend! <= this._dtstart!) {
      this._dtend = addMilliseconds(new Date(this._dtstart), duration);
      this._info = this.hass.localize(
        "ui.components.calendar.event.end_auto_adjusted"
      );
    }
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._dtend = this._parseDate(
      `${this._formatDate(this._dtend!)}T${ev.detail.value}`
    );
  }

  private _calculateData() {
    const data: CalendarEventMutableParams = {
      summary: this._summary,
      description: this._description,
      rrule: this._rrule || undefined,
      dtstart: "",
      dtend: "",
    };
    if (this._allDay) {
      data.dtstart = this._formatDate(this._dtstart!);
      // End date/time is exclusive when persisted
      data.dtend = this._formatDate(addDays(this._dtend!, 1));
    } else {
      data.dtstart = `${this._formatDate(
        this._dtstart!,
        this.hass.config.time_zone
      )}T${this._formatTime(this._dtstart!, this.hass.config.time_zone)}`;
      data.dtend = `${this._formatDate(
        this._dtend!,
        this.hass.config.time_zone
      )}T${this._formatTime(this._dtend!, this.hass.config.time_zone)}`;
    }
    return data;
  }

  private _handleCalendarChanged(ev: CustomEvent) {
    this._calendarId = ev.detail.value;
  }

  private _isValidStartEnd(): boolean {
    if (this._allDay) {
      return this._dtend! >= this._dtstart!;
    }
    return this._dtend! > this._dtstart!;
  }

  private async _createEvent() {
    if (!this._summary || !this._calendarId) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.not_all_required_fields"
      );
      return;
    }

    if (!this._isValidStartEnd()) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.invalid_duration"
      );
      return;
    }

    this._submitting = true;
    try {
      await createCalendarEvent(
        this.hass!,
        this._calendarId!,
        this._calculateData()
      );
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this.closeDialog();
  }

  private async _saveEvent() {
    if (!this._summary || !this._calendarId) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.not_all_required_fields"
      );
      return;
    }

    if (!this._isValidStartEnd()) {
      this._error = this.hass.localize(
        "ui.components.calendar.event.invalid_duration"
      );
      return;
    }

    this._submitting = true;
    const entry = this._params!.entry!;
    let range: RecurrenceRange | undefined = RecurrenceRange.THISEVENT;
    if (entry.recurrence_id) {
      range = await showConfirmEventDialog(this, {
        title: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update"
        ),
        text: this.hass.localize(
          "ui.components.calendar.event.confirm_update.recurring_prompt"
        ),
        confirmText: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update_this"
        ),
        confirmFutureText: this.hass.localize(
          "ui.components.calendar.event.confirm_update.update_future"
        ),
      });
    }
    if (range === undefined) {
      // Cancel
      this._submitting = false;
      return;
    }
    const eventData = this._calculateData();
    if (entry.rrule && eventData.rrule && range === RecurrenceRange.THISEVENT) {
      // Updates to a single instance of a recurring event by definition
      // cannot change the recurrence rule and doing so would be invalid.
      // It is difficult to detect if the user changed the recurrence rule
      // since updating the date may change it implicitly (e.g. day of week
      // of the event changes) so we just assume the users intent based on
      // recurrence range and drop any other rrule changes.
      eventData.rrule = undefined;
    }
    try {
      await updateCalendarEvent(
        this.hass!,
        this._calendarId!,
        entry.uid!,
        eventData,
        entry.recurrence_id || "",
        range!
      );
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this.closeDialog();
  }

  private async _deleteEvent() {
    this._submitting = true;
    const entry = this._params!.entry!;
    const range = await showConfirmEventDialog(this, {
      title: this.hass.localize(
        "ui.components.calendar.event.confirm_delete.delete"
      ),
      text: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.recurring_prompt"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.prompt"
          ),
      confirmText: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_this"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete"
          ),
      confirmFutureText: entry.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_future"
          )
        : undefined,
    });
    if (range === undefined) {
      // Cancel
      this._submitting = false;
      return;
    }
    try {
      await deleteCalendarEvent(
        this.hass!,
        this._calendarId!,
        entry.uid!,
        entry.recurrence_id || "",
        range!
      );
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
      return;
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        state-info {
          line-height: 40px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
        ha-textfield,
        ha-textarea {
          display: block;
        }
        ha-textarea {
          margin-bottom: 16px;
        }
        ha-formfield {
          display: block;
          padding: 16px 0;
        }
        ha-date-input {
          flex-grow: 1;
        }
        ha-time-input {
          margin-left: 16px;
        }
        ha-recurrence-rule-editor {
          display: block;
          margin-top: 16px;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .label {
          font-size: 12px;
          font-weight: 500;
          color: var(--input-label-ink-color);
        }
        .date-range-details-content {
          display: inline-block;
        }
        ha-rrule {
          display: block;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        ha-rrule {
          display: inline-block;
        }
        .key {
          display: inline-block;
          vertical-align: top;
        }
        .value {
          display: inline-block;
          vertical-align: top;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-calendar-event-editor": DialogCalendarEventEditor;
  }
}
