import "@material/mwc-button";
import { mdiClose } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { addDays, addHours, startOfHour } from "date-fns/esm";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
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

  @state() private _data?: CalendarEventMutableParams;

  @state() private _allDay = false;

  @state() private _dtstart?: Date; // In sync with _data.dtstart

  @state() private _dtend?: Date; // Inclusive for display, in sync with _data.dtend (exclusive)

  @state() private _submitting = false;

  public async showDialog(
    params: CalendarEventEditDialogParams
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
        this._dtstart = new Date(entry.dtstart);
        // Calendar event end dates are exclusive, but not shown that way in the UI. The
        // reverse happens when persisting the event.
        this._dtend = new Date(entry.dtend);
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
      this._allDay = false;
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
                .value=${this._data!.dtstart}
                .locale=${this.hass.locale}
                @value-changed=${this._startDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${this._data!.dtstart.split("T")[1]}
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
                .value=${this._data!.dtend}
                .min=${this._data!.dtstart}
                .locale=${this.hass.locale}
                @value-changed=${this._endDateChanged}
              ></ha-date-input>
              ${!this._allDay
                ? html`<ha-time-input
                    .value=${this._data!.dtend.split("T")[1]}
                    .locale=${this.hass.locale}
                    @value-changed=${this._endTimeChanged}
                  ></ha-time-input>`
                : ""}
            </div>
          </div>
          <ha-recurrence-rule-editor
            .locale=${this.hass.locale}
            .value=${this._data!.rrule || ""}
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

  private _handleSummaryChanged(ev) {
    this._data!.summary = ev.target.value;
  }

  private _handleRRuleChanged(ev) {
    this._data!.rrule = ev.detail.value;
    this.requestUpdate();
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.target.checked;
    this._dateChanged();
  }

  private _startDateChanged(ev: CustomEvent) {
    this._dtstart = new Date(
      ev.detail.value + "T" + this._dtstart!.toISOString().split("T")[1]
    );
    this._dateChanged();
  }

  private _endDateChanged(ev: CustomEvent) {
    this._dtend = new Date(
      ev.detail.value + "T" + this._dtend!.toISOString().split("T")[1]
    );
    this._dateChanged();
  }

  private _startTimeChanged(ev: CustomEvent) {
    this._dtstart = new Date(
      this._dtstart!.toISOString().split("T")[0] + "T" + ev.detail.value
    );
    this._dateChanged();
  }

  private _endTimeChanged(ev: CustomEvent) {
    this._dtend = new Date(
      this._dtend!.toISOString().split("T")[0] + "T" + ev.detail.value
    );
    this._dateChanged();
  }

  private _dateChanged() {
    if (this._allDay) {
      this._data!.dtstart = this._dtstart!.toISOString();
      // End date/time is exclusive when persisted
      this._data!.dtend = addDays(new Date(this._dtend!), 1).toISOString();
    } else {
      this._data!.dtstart = this._dtstart!.toISOString();
      this._data!.dtend = this._dtend!.toISOString();
    }
  }

  private _handleCalendarChanged(ev: CustomEvent) {
    this._calendarId = ev.detail.value;
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
