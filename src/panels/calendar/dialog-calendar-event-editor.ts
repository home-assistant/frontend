import "@material/mwc-button";
import { mdiClose } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { addDays, addHours, startOfHour } from "date-fns/esm";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isDate } from "../../common/string/is_date";
import "../../components/ha-date-input";
import "../../components/ha-time-input";
import {
  Calendar,
  CalendarEventMutableParams,
  createCalendarEvent,
  deleteCalendarEvent,
} from "../../data/calendar";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import "./ha-recurrence-rule-editor";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";
import { CalendarEventDetailDialogParams } from "./show-dialog-calendar-event-detail";
import { CalendarEventEditDialogParams } from "./show-dialog-calendar-event-editor";

const rowRenderer: ComboBoxLitRenderer<Calendar> = (
  item
) => html`<mwc-list-item>
  <span>${item.name}</span>
</mwc-list-item>`;

@customElement("dialog-calendar-event-editor")
class DialogCalendarEventEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: CalendarEventDetailDialogParams;

  @state() private _calendars: Calendar[] = [];

  @state() private _calendarId?: string;

  @state() private _summary = "";

  @state() private _rrule?: string;

  @state() private _allDay = false;

  @state() private _dtstart?: Date; // In sync with _data.dtstart

  @state() private _dtend?: Date; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  public showDialog(params: CalendarEventEditDialogParams): void {
    this._error = undefined;
    this._params = params;
    this._calendars = params.calendars;
    this._calendarId = params.calendarId || this._calendars[0].entity_id;
    if (params.entry) {
      const entry = params.entry!;
      this._allDay = isDate(entry.dtstart);
      this._summary = entry.summary;
      this._rrule = entry.rrule;
      if (this._allDay) {
        this._dtstart = new Date(entry.dtstart);
        // Calendar event end dates are exclusive, but not shown that way in the UI. The
        // reverse happens when persisting the event.
        this._dtend = addDays(new Date(entry.dtend), -1);
      } else {
        this._dtstart = new Date(entry.dtstart);
        this._dtend = new Date(entry.dtend);
      }
    } else {
      this._allDay = false;
      // If we have been provided a selected date (e.g. based on the currently displayed
      // day in a calendar view), use that as the starting value.
      if (params.selectedDate) {
        const startingDate = params.selectedDate;
        startingDate.setHours(startOfHour(new Date()).getHours());
        this._dtstart = startingDate;
      } else {
        this._dtstart = startOfHour(new Date());
      }
      this._dtend = addHours(this._dtstart, 1);
    }
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const isCreate = this._params.entry === undefined;

    const { startDate, startTime, endDate, endTime } = this._getLocaleStrings(
      this._dtstart,
      this._dtend
    );

    return html`
      <ha-dialog
        open
        @closed=${this._close}
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

          <ha-textfield
            class="summary"
            name="summary"
            .label=${this.hass.localize("ui.components.calendar.event.summary")}
            required
            @change=${this._handleSummaryChanged}
            error-message=${this.hass.localize("ui.common.error_required")}
            dialogInitialFocus
          ></ha-textfield>
          <ha-combo-box
            name="calendar"
            .hass=${this.hass}
            .label=${this.hass.localize("ui.components.calendar.label")}
            .value=${this._calendarId!}
            .renderer=${rowRenderer}
            .items=${this._calendars}
            item-id-path="entity_id"
            item-value-path="entity_id"
            item-label-path="name"
            required
            @value-changed=${this._handleCalendarChanged}
          ></ha-combo-box>
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
            .locale=${this.hass.locale}
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
          : html` <mwc-button
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
                : ""}`}
      </ha-dialog>
    `;
  }

  private _getLocaleStrings = memoizeOne((startDate?: Date, endDate?: Date) =>
    // en-CA locale used for date format YYYY-MM-DD
    // en-GB locale used for 24h time format HH:MM:SS
    {
      const timeZone = this.hass.config.time_zone;
      return {
        startDate: startDate?.toLocaleDateString("en-CA", { timeZone }),
        startTime: startDate?.toLocaleTimeString("en-GB", { timeZone }),
        endDate: endDate?.toLocaleDateString("en-CA", { timeZone }),
        endTime: endDate?.toLocaleTimeString("en-GB", { timeZone }),
      };
    }
  );

  private _handleSummaryChanged(ev) {
    this._summary = ev.target.value;
  }

  private _handleRRuleChanged(ev) {
    this._rrule = ev.detail.value;
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
  }

  private _startDateChanged(ev: CustomEvent) {
    this._dtstart = new Date(
      ev.detail.value + "T" + this._dtstart!.toISOString().split("T")[1]
    );
  }

  private _endDateChanged(ev: CustomEvent) {
    this._dtend = new Date(
      ev.detail.value + "T" + this._dtend!.toISOString().split("T")[1]
    );
  }

  private _startTimeChanged(ev: CustomEvent) {
    this._dtstart = new Date(
      this._dtstart!.toISOString().split("T")[0] + "T" + ev.detail.value
    );
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._dtend = new Date(
      this._dtend!.toISOString().split("T")[0] + "T" + ev.detail.value
    );
  }

  private _calculateData() {
    const { startDate, startTime, endDate, endTime } = this._getLocaleStrings(
      this._dtstart,
      this._dtend
    );
    const data: CalendarEventMutableParams = {
      summary: this._summary,
      rrule: this._rrule,
      dtstart: "",
      dtend: "",
    };
    if (this._allDay) {
      data.dtstart = startDate!;
      // End date/time is exclusive when persisted
      data.dtend = addDays(new Date(this._dtend!), 1).toLocaleDateString(
        "en-CA"
      );
    } else {
      data.dtstart = `${startDate}T${startTime}`;
      data.dtend = `${endDate}T${endTime}`;
    }
    return data;
  }

  private _handleCalendarChanged(ev: CustomEvent) {
    this._calendarId = ev.detail.value;
  }

  private async _createEvent() {
    this._submitting = true;
    try {
      await createCalendarEvent(
        this.hass!,
        this._calendarId!,
        this._calculateData()
      );
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this._params = undefined;
  }

  private async _saveEvent() {
    // to be implemented
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
    this._close();
  }

  private _close(): void {
    this._calendars = [];
    this._calendarId = undefined;
    this._params = undefined;
    this._dtstart = undefined;
    this._dtend = undefined;
    this._summary = "";
    this._rrule = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        state-info {
          line-height: 40px;
        }
        ha-textfield {
          display: block;
          margin-bottom: 24px;
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
        ha-combo-box {
          display: block;
          margin-bottom: 24px;
        }
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
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
