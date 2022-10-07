import "@material/mwc-button";
import { mdiClose } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { startOfToday, startOfTomorrow } from "date-fns/esm";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import "../../components/ha-date-range-picker";
import { formatAttributeValue } from "../../data/entity_attributes";
import { isDate } from "../../common/string/is_date";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import {
  Calendar,
  CalendarEventData,
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

class DialogCalendarEventDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarEventDetailDialogParams;

  @state() private _calendars: Calendar[] = [];

  @state() private _calendarId?: string;

  @state() private _calendarEvent?: CalendarEventData;

  @state() private _allDay = false;

  @state() private _error?: string;

  @state() private _submitting = false;

  public async showDialog(
    params: CalendarEventDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._calendars = params.calendars || [];
    if (params.calendarId) {
      this._calendarId = params.calendarId;
    } else {
      this._calendarId = this._calendars[0].entity_id;
    }
    if (params.calendarEvent) {
      this._calendarEvent = params.calendarEvent;
      this._allDay = isDate(this._calendarEvent.dtstart);
    } else {
      // XXX Make sure this is a "date"
      this._calendarEvent = {
        summary: "",
        // YYYY-MM-DD
        dtstart: startOfToday().toJSON().substring(0, 10),
        dtend: startOfTomorrow().toJSON().substring(0, 10),
      };
      this._allDay = true;
    }
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const isCreate = this._params.calendarEvent === undefined;
    const calendarEvent = this._calendarEvent!;

    return html`
      <ha-dialog
        open
        @closed=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${html`
          <div class="header_title">
            ${this._params.calendarEvent
              ? calendarEvent.summary
              : this.hass.localize("ui.components.calendar.event.add")}
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
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${isCreate
            ? html`
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
              `
            : html``}

          <ha-formfield
            .label=${this.hass.localize("ui.components.calendar.event.all_day")}
          >
            <ha-switch
              id="all_day"
              .checked=${this._allDay}
              @change=${this._allDayToggleChanged}
            ></ha-switch>
          </ha-formfield>

          ${!isCreate
            ? html`
                <div class="data-entry">
                  <div class="key">Start</div>
                  <div class="value">
                    ${formatAttributeValue(this.hass, calendarEvent.dtstart)}
                  </div>
                </div>

                <div class="data-entry">
                  <div class="key">End</div>
                  <div class="value">
                    ${formatAttributeValue(this.hass, calendarEvent.dtend)}
                  </div>
                </div>
              `
            : html`
                <ha-date-range-picker
                  .hass=${this.hass}
                  startDate=${calendarEvent.dtstart}
                  endDate=${calendarEvent.dtend}
                  autoApply="true"
                  timePicker=${!this._allDay}
                  @change=${this._dateRangeChanged}
                ></ha-date-range-picker>
              `}

          <ha-formfield
            .label=${this.hass.localize("ui.components.calendar.event.repeat")}
          >
            <ha-switch
              id="repeat"
              .checked=${calendarEvent.rrule !== undefined}
              @change=${this._handleRepeatChanged}
            ></ha-switch>
          </ha-formfield>

          ${calendarEvent.rrule !== undefined
            ? html`
                <ha-textfield
                  id="rrule"
                  .label=${this.hass.localize(
                    "ui.components.calendar.event.repeat"
                  )}
                  .value=${calendarEvent.rrule}
                  @change=${this._handleRRuleChanged}
                >
                </ha-textfield>
              `
            : html``}

          <ha-combo-box
            name="calendar"
            .hass=${this.hass}
            .disabled=${!!this._params.calendarId}
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
        </div>

        ${!isCreate
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.delete")}
              </mwc-button>
            `
          : html`
              <mwc-button
                slot="primaryAction"
                @click=${this._createEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.add")}
              </mwc-button>
            `}
      </ha-dialog>
    `;
  }

  private _handleSummaryChanged(ev) {
    this._error = undefined;
    this._calendarEvent!.summary = ev.target.value;
  }

  private _handleRepeatChanged(ev) {
    this._error = undefined;
    if (ev.target.checked) {
      this._calendarEvent!.rrule = "FREQ=DAILY";
    } else {
      this._calendarEvent!.rrule = undefined;
    }
    this.requestUpdate();
  }

  private _handleCalendarPicked(_ev) {
    this._error = undefined;
    // XXX
    this.requestUpdate();
  }

  private _handleRRuleChanged(ev) {
    this._error = undefined;
    this._calendarEvent!.rrule = ev.target.value;
    this.requestUpdate();
  }

  private _allDayToggleChanged(ev) {
    this._allDay = ev.checked;
  }

  private _dateRangeChanged(ev: CustomEvent) {
    this._calendarEvent!.dtstart = ev.detail.startDate;
    const endDate = ev.detail.endDate;
    // TODO: Fix logic for all day event
    if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    }
    this._calendarEvent!.dtend = endDate;
    this.requestUpdate();
  }

  private async _createEvent() {
    this._submitting = true;
    try {
      await createCalendarEvent(
        this.hass!,
        this._calendarId!,
        this._calendarEvent!
      );
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
    const calendarEvent = this._params!.calendarEvent!;
    await showConfirmEventDialog(this, {
      title: this.hass.localize(
        "ui.components.calendar.event.confirm_delete.delete"
      ),
      text: calendarEvent.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.recurring_prompt"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.prompt"
          ),
      confirmText: calendarEvent.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_this"
          )
        : this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete"
          ),
      confirmFutureText: calendarEvent.recurrence_id
        ? this.hass.localize(
            "ui.components.calendar.event.confirm_delete.delete_future"
          )
        : undefined,
      confirm: async () => {
        try {
          await deleteCalendarEvent(
            this.hass!,
            this._calendarId!,
            calendarEvent.uid!,
            calendarEvent.recurrence_id
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
            calendarEvent.uid!,
            calendarEvent.recurrence_id!,
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
    this._params = undefined;
    this._calendarEvent = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-picture-upload,
        ha-textfield {
          display: block;
          margin-bottom: 24px;
        }
        ha-picture-upload {
          margin-top: 16px;
        }
        ha-formfield {
          display: block;
          padding: 16px 0;
        }
        ha-combo-box {
          display: block;
          margin-bottom: 24px;
        }
        a {
          color: var(--primary-color);
        }
        p {
          color: var(--primary-text-color);
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
