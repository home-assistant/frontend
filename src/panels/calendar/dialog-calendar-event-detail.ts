import "@material/mwc-button";
import { mdiCalendarClock, mdiClose } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { isSameDay, startOfHour, addHours } from "date-fns/esm";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import "../../components/ha-date-range-picker";
import "../lovelace/components/hui-generic-entity-row";
import { formatAttributeValue } from "../../data/entity_attributes";
import { formatTime } from "../../common/datetime/format_time";
import { formatDate } from "../../common/datetime/format_date";
import { formatDateTime } from "../../common/datetime/format_date_time";
import { isDate } from "../../common/string/is_date";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import {
  Calendar,
  CalendarEventMutableParams,
  createCalendarEvent,
  deleteCalendarEvent,
  RecurrenceRange,
} from "../../data/calendar";
import { CalendarEventDetailDialogParams } from "./show-dialog-calendar-event-detail";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";

const rowRenderer: ComboBoxLitRenderer<Calendar> = (
  item
) => html`<mwc-list-item>
  <span>${item.name}</span>
</mwc-list-item>`;

// Parse an ISO8001 format date string as local time
const parseLocalDate = (str: string): Date => {
  const parts = str.split(/\D/);
  if (parts.length !== 3) {
    throw new Error("Expected ISO date string YYYY-MM-DD");
  }
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2]),
    0,
    0,
    0
  );
};

class DialogCalendarEventDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _error?: string;

  @state() private _params?: CalendarEventDetailDialogParams;

  @state() private _calendars: Calendar[] = [];

  @state() private _calendarId?: string;

  @state() private _data?: CalendarEventMutableParams;

  @state() private _allDay = false;

  @state() private _dtstart?: Date; // In sync with _data.dtstart

  @state() private _dtend?: Date; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  public async showDialog(
    params: CalendarEventDetailDialogParams
  ): Promise<void> {
    this._error = undefined;
    this._params = params;
    this._calendars = params.calendars;
    this._calendarId = params.calendarId || this._calendars[0].entity_id;
    if (params.entry) {
      const entry = params.entry!;
      this._data = entry;
      this._allDay = isDate(entry.dtstart);
      if (this._allDay) {
        this._dtstart = parseLocalDate(entry.dtstart);
        // Calendar event end dates are exclusive, but not shown that way in the UI. The
        // reverse happens when persisting the event.
        this._dtend = parseLocalDate(entry.dtend);
        this._dtend.setDate(this._dtend.getDate() - 1);
      } else {
        this._dtstart = new Date(entry.dtstart);
        this._dtend = new Date(entry.dtend);
      }
    } else {
      this._data = {
        summary: "",
        // Dates are set in _dateChanged()
        dtstart: "",
        dtend: "",
      };
      // Event defaults to the current hour, but initally shows as
      // an all day event. The time is preserved when toggling allDay,
      // but truncated when persisted.
      this._allDay = true;
      this._dtstart = startOfHour(new Date());
      this._dtend = addHours(this._dtstart, 1);
      this._dateChanged();
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const isCreate = this._params.entry === undefined;
    const stateObj = this.hass.states[this._calendarId!];
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
              : this._data!.summary}
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
          ${isCreate
            ? html`
                ${this._error
                  ? html` <div class="error">${this._error}</div> `
                  : ""}

                <ha-textfield
                  class="summary"
                  name="summary"
                  .label=${this.hass.localize(
                    "ui.components.calendar.event.summary"
                  )}
                  required
                  @change=${this._handleSummaryChanged}
                  error-message=${this.hass.localize(
                    "ui.common.error_required"
                  )}
                  dialogInitialFocus
                ></ha-textfield>

                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.components.calendar.event.all_day"
                  )}
                >
                  <ha-switch
                    id="all_day"
                    .checked=${this._allDay}
                    @change=${this._allDayToggleChanged}
                  ></ha-switch>
                </ha-formfield>

                <ha-date-range-picker
                  .hass=${this.hass}
                  startDate=${this._dtstart!}
                  endDate=${this._dtend!}
                  autoApply="true"
                  timePicker=${!this._allDay}
                  @change=${this._dateRangeChanged}
                ></ha-date-range-picker>

                <ha-formfield
                  .label=${this.hass.localize(
                    "ui.components.calendar.event.repeat"
                  )}
                >
                  <ha-switch
                    id="repeat"
                    .checked=${this._data!.rrule !== undefined}
                    @change=${this._handleRepeatChanged}
                  ></ha-switch>
                </ha-formfield>

                ${this._data!.rrule !== undefined
                  ? html`
                      <ha-textfield
                        id="rrule"
                        .label=${this.hass.localize(
                          "ui.components.calendar.event.repeat"
                        )}
                        .value=${this._data!.rrule}
                        @change=${this._handleRRuleChanged}
                      >
                      </ha-textfield>
                    `
                  : html``}

                <ha-combo-box
                  name="calendar"
                  .hass=${this.hass}
                  .disabled=${!this._params.calendarId}
                  .label=${this.hass.localize("ui.components.calendar.label")}
                  .value=${this._calendarId!}
                  .renderer=${rowRenderer}
                  .items=${this._calendars}
                  item-id-path="entity_id"
                  item-value-path="entity_id"
                  item-label-path="name"
                  required
                  @value-changed=${this._handleCalendarPicked}
                ></ha-combo-box>

                <mwc-button
                  slot="primaryAction"
                  @click=${this._createEvent}
                  .disabled=${this._submitting}
                >
                  ${this.hass.localize("ui.components.calendar.event.add")}
                </mwc-button>
              `
            : html`
                <div class="field">
                  <ha-svg-icon .path=${mdiCalendarClock}></ha-svg-icon>
                  <div class="value">
                    ${this._formatDateRange()}<br />
                    ${this._data!.rrule !== undefined
                      ? formatAttributeValue(this.hass, this._data!.rrule!)
                      : html``}
                  </div>
                </div>

                <div class="attribute">
                  <state-info
                    .hass=${this.hass}
                    .stateObj=${stateObj}
                    .inDialog="true"
                  ></state-info>
                </div>

                <mwc-button
                  slot="secondaryAction"
                  class="warning"
                  @click=${this._deleteEvent}
                  .disabled=${this._submitting}
                >
                  ${this.hass.localize("ui.components.calendar.event.delete")}
                </mwc-button>
              `}
        </div>
      </ha-dialog>
    `;
  }

  private _handleSummaryChanged(ev) {
    this._data!.summary = ev.target.value;
  }

  private _handleRepeatChanged(ev) {
    if (ev.target.checked) {
      this._data!.rrule = "FREQ=DAILY";
    } else {
      this._data!.rrule = undefined;
    }
    this.requestUpdate();
  }

  private _handleRRuleChanged(ev) {
    this._data!.rrule = ev.target.value;
    this.requestUpdate();
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
    this._dateChanged();
    this.requestUpdate();
  }

  private _dateRangeChanged(ev: CustomEvent) {
    this._dtstart = ev.detail.startDate;
    this._dtend = ev.detail.endDate;
    this._dateChanged();
    this.requestUpdate();
  }

  private _dateChanged() {
    if (this._allDay) {
      // End date/time is exclusive when persisted
      const endDate = new Date(this._dtend!);
      endDate.setDate(endDate.getDate() + 1);
      this._data!.dtstart = this._dtstart!.toJSON().substring(0, 10); // YYYY-MM-DD
      this._data!.dtend = endDate.toJSON().substring(0, 10);
    } else {
      this._data!.dtstart = this._dtstart!.toJSON();
      this._data!.dtend = this._dtend!.toJSON();
    }
  }

  private _formatDateRange() {
    // The range can be shortened when the start and end are on the same day.
    if (isSameDay(this._dtstart!, this._dtend!)) {
      if (this._allDay) {
        // Single date string only
        return formatDate(this._dtstart!, this.hass.locale);
      }
      // Single day with a start/end time range
      return `${formatDate(this._dtstart!, this.hass.locale)} ${formatTime(
        this._dtstart!,
        this.hass.locale
      )} - ${formatTime(this._dtend!, this.hass.locale)}`;
    }
    // An event across multiple dates, optionally with a time range
    return `${formatDateTime(
      this._dtstart!,
      this.hass.locale
    )} - ${formatDateTime(this._dtend!, this.hass.locale)}`;
  }

  private _handleCalendarPicked(_ev) {
    // XXX
    this.requestUpdate();
  }

  private async _createEvent() {
    this._submitting = true;
    try {
      await createCalendarEvent(this.hass!, this._calendarId!, this._data!);
    } catch (err: any) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
    await this._params!.updated();
    this._params = undefined;
  }

  private async _deleteEvent() {
    this._submitting = true;
    const entry = this._params!.entry!;
    await showConfirmEventDialog(this, {
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
      confirm: async () => {
        try {
          await deleteCalendarEvent(
            this.hass!,
            this._calendarId!,
            entry.uid!,
            entry.recurrence_id
          );
        } catch (err: any) {
          this._error = err ? err.message : "Unknown error";
          return;
        } finally {
          this._submitting = false;
        }
        await this._params!.updated();
        this._params = undefined;
      },
      confirmFuture: async () => {
        try {
          await deleteCalendarEvent(
            this.hass!,
            this._calendarId!,
            entry.uid!,
            entry.recurrence_id!,
            RecurrenceRange.THISANDFUTURE
          );
        } catch (err: any) {
          this._error = err ? err.message : "Unknown error";
          return;
        } finally {
          this._submitting = false;
        }
        await this._params!.updated();
        this._params = undefined;
      },
      destructive: true,
    });
    // TODO: Block the result and run the submitting check here?
  }

  private _close(): void {
    this._calendars = [];
    this._calendarId = undefined;
    this._params = undefined;
    this._data = undefined;
    this._dtstart = undefined;
    this._dtend = undefined;
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
        ha-date-range-picker {
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          max-width: 100%;
          direction: var(--direction);
        }
        :host([narrow]) ha-date-range-picker {
          margin-right: 0;
          margin-inline-end: 0;
          margin-inline-start: initial;
          direction: var(--direction);
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
        .field {
          vertical-align: top;
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
    "dialog-calendar-event-detail": DialogCalendarEventDetail;
  }
}

customElements.define(
  "dialog-calendar-event-detail",
  DialogCalendarEventDetail
);
