import { mdiCalendarClock } from "@mdi/js";
import { toDate } from "date-fns-tz";
import { addDays, isSameDay } from "date-fns";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { formatDate } from "../../common/datetime/format_date";
import { formatDateTime } from "../../common/datetime/format_date_time";
import { formatTime } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import { isDate } from "../../common/string/is_date";
import "../../components/entity/state-info";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-date-input";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-time-input";
import type { CalendarEventMutableParams } from "../../data/calendar";
import { deleteCalendarEvent } from "../../data/calendar";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-generic-entity-row";
import { renderRRuleAsText } from "./recurrence";
import { showConfirmEventDialog } from "./show-confirm-event-dialog-box";
import type { CalendarEventDetailDialogParams } from "./show-dialog-calendar-event-detail";
import { showCalendarEventEditDialog } from "./show-dialog-calendar-event-editor";
import { resolveTimeZone } from "../../common/datetime/resolve-time-zone";

class DialogCalendarEventDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: CalendarEventDetailDialogParams;

  @state() private _calendarId?: string;

  @state() private _submitting = false;

  @state() private _error?: string;

  @state() private _data!: CalendarEventMutableParams;

  public async showDialog(
    params: CalendarEventDetailDialogParams
  ): Promise<void> {
    this._params = params;
    if (params.entry) {
      const entry = params.entry!;
      this._data = entry;
      this._calendarId = params.calendarId;
    }
  }

  public closeDialog(): void {
    this._calendarId = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const stateObj = this.hass.states[this._calendarId!];
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._data!.summary)}
      >
        <div class="content">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          <div class="field">
            <ha-svg-icon .path=${mdiCalendarClock}></ha-svg-icon>
            <div class="value">
              ${this._formatDateRange()}<br />
              ${this._data!.rrule
                ? this._renderRRuleAsText(this._data.rrule)
                : ""}
              ${this._data.description
                ? html`<br />
                    <div class="description">${this._data.description}</div>
                    <br />`
                : nothing}
            </div>
          </div>

          <div class="attribute">
            <state-info
              .hass=${this.hass}
              .stateObj=${stateObj}
              .color=${this._params.color}
              in-dialog
            ></state-info>
          </div>
        </div>
        ${this._params.canDelete
          ? html`
              <ha-button
                slot="secondaryAction"
                variant="danger"
                appearance="plain"
                @click=${this._deleteEvent}
                .disabled=${this._submitting}
              >
                ${this.hass.localize("ui.components.calendar.event.delete")}
              </ha-button>
            `
          : ""}
        ${this._params.canEdit
          ? html`<ha-button
              slot="primaryAction"
              @click=${this._editEvent}
              .disabled=${this._submitting}
            >
              ${this.hass.localize("ui.components.calendar.event.edit")}
            </ha-button>`
          : ""}
      </ha-dialog>
    `;
  }

  private _renderRRuleAsText(value: string) {
    if (!value) {
      return "";
    }
    try {
      const ruleText = renderRRuleAsText(this.hass, value);
      if (ruleText !== undefined) {
        return html`<div id="text">${ruleText}</div>`;
      }
      return html`<div id="text">Cannot convert recurrence rule</div>`;
    } catch (_e) {
      return "Error while processing the rule";
    }
  }

  private _formatDateRange() {
    const timeZone = resolveTimeZone(
      this.hass.locale.time_zone,
      this.hass.config.time_zone
    );
    const start = toDate(this._data!.dtstart, { timeZone: timeZone });
    const endValue = toDate(this._data!.dtend, { timeZone: timeZone });
    // All day events should be displayed as a day earlier
    const end = isDate(this._data.dtend) ? addDays(endValue, -1) : endValue;
    // The range can be shortened when the start and end are on the same day.
    if (isSameDay(start, end)) {
      if (isDate(this._data.dtstart)) {
        // Single date string only
        return formatDate(start, this.hass.locale, this.hass.config);
      }
      // Single day with a start/end time range
      return `${formatDate(
        start,
        this.hass.locale,
        this.hass.config
      )} ${formatTime(
        start,
        this.hass.locale,
        this.hass.config
      )} - ${formatTime(end, this.hass.locale, this.hass.config)}`;
    }
    // An event across multiple dates, optionally with a time range
    return `${
      isDate(this._data.dtstart)
        ? formatDate(start, this.hass.locale, this.hass.config)
        : formatDateTime(start, this.hass.locale, this.hass.config)
    } - ${
      isDate(this._data.dtend)
        ? formatDate(end, this.hass.locale, this.hass.config)
        : formatDateTime(end, this.hass.locale, this.hass.config)
    }`;
  }

  private async _editEvent() {
    showCalendarEventEditDialog(this, this._params!);
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
        ha-svg-icon {
          width: 40px;
          margin-right: 8px;
          margin-inline-end: 8px;
          margin-inline-start: initial;
          direction: var(--direction);
          vertical-align: top;
        }
        .field {
          display: flex;
        }
        .description {
          color: var(--secondary-text-color);
          max-width: 300px;
          overflow-wrap: break-word;
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
