import { TZDate } from "@date-fns/tz";
import { consume, type ContextType } from "@lit/context";
import type { ActionDetail } from "@material/mwc-list";
import { mdiCalendarToday } from "@mdi/js";
import "cally";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators";
import { firstWeekdayIndex } from "../../common/datetime/first_weekday";
import {
  formatCallyDateRange,
  formatDateMonth,
  formatDateYear,
  formatISODateOnly,
} from "../../common/datetime/format_date";
import { fireEvent } from "../../common/dom/fire_event";
import {
  configContext,
  localeContext,
  localizeContext,
} from "../../data/context";
import { TimeZone } from "../../data/translation";
import type { ValueChangedEvent } from "../../types";
import type { HaBaseTimeInput } from "../ha-base-time-input";
import "../ha-icon-button";
import "../ha-icon-button-next";
import "../ha-icon-button-prev";
import "../ha-list";
import "../ha-list-item";
import "../ha-time-input";
import type { DateRangePickerRanges } from "./ha-date-range-picker";
import { datePickerStyles, dateRangePickerStyles } from "./styles";
import type { HaTimeInput } from "../ha-time-input";

@customElement("date-range-picker")
export class DateRangePicker extends LitElement {
  @property({ attribute: false }) public ranges?: DateRangePickerRanges | false;

  @property({ attribute: false }) public startDate?: Date;

  @property({ attribute: false }) public endDate?: Date;

  @property({ type: Boolean, attribute: "time-picker" })
  public timePicker = false;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: localeContext, subscribe: true })
  private locale!: ContextType<typeof localeContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private hassConfig!: ContextType<typeof configContext>;

  /** used to show month in calendar-range header */
  @state() private _pickerMonth?: string;

  /** used to show year in calendar-date header */
  @state() private _pickerYear?: string;

  /** used for today to navigate focus in calendar-range  */
  @state() private _focusDate?: string;

  @state() private _dateValue?: string;

  @state() private _timeValue = {
    from: { hours: 0, minutes: 0 },
    to: { hours: 23, minutes: 59 },
  };

  @queryAll("ha-time-input") private _timeInputs?: NodeListOf<HaTimeInput>;

  public connectedCallback() {
    super.connectedCallback();

    const date = this.startDate || new Date();

    this._dateValue =
      this.startDate && this.endDate
        ? formatCallyDateRange(
            this.startDate,
            this.endDate,
            this.locale,
            this.hassConfig
          )
        : undefined;
    this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);
    this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);

    if (this.timePicker && this.startDate && this.endDate) {
      this._timeValue = {
        from: {
          hours: this.startDate.getHours(),
          minutes: this.startDate.getMinutes(),
        },
        to: {
          hours: this.endDate.getHours(),
          minutes: this.endDate.getMinutes(),
        },
      };
    }
  }

  render() {
    return html`<div class="picker">
        ${this.ranges !== false && this.ranges
          ? html`<div class="date-range-ranges">
              <ha-list @action=${this._setDateRange} activatable>
                ${Object.keys(this.ranges).map(
                  (name) => html`<ha-list-item>${name}</ha-list-item>`
                )}
              </ha-list>
            </div>`
          : nothing}
        <div class="range">
          <calendar-range
            .value=${this._dateValue}
            .locale=${this.locale.language}
            .focusedDate=${this._focusDate}
            @focusday=${this._focusChanged}
            @change=${this._handleChange}
            show-outside-days
            .firstDayOfWeek=${firstWeekdayIndex(this.locale)}
          >
            <ha-icon-button-prev
              tabindex="-1"
              slot="previous"
            ></ha-icon-button-prev>
            <div class="heading" slot="heading">
              <span class="month-year"
                >${this._pickerMonth} ${this._pickerYear}</span
              >
              <ha-icon-button
                @click=${this._focusToday}
                .path=${mdiCalendarToday}
                .label=${this.localize("ui.dialogs.date-picker.today")}
              ></ha-icon-button>
            </div>
            <ha-icon-button-next
              tabindex="-1"
              slot="next"
            ></ha-icon-button-next>
            <calendar-month></calendar-month>
          </calendar-range>
          ${this.timePicker
            ? html`
                <div class="times">
                  <ha-time-input
                    .value=${`${this._timeValue.from.hours}:${this._timeValue.from.minutes}`}
                    .locale=${this.locale}
                    @value-changed=${this._handleChangeTime}
                    .label=${this.localize(
                      "ui.components.date-range-picker.time_from"
                    )}
                    id="from"
                    placeholder-labels
                    auto-validate
                  ></ha-time-input>
                  <ha-time-input
                    .value=${`${this._timeValue.to.hours}:${this._timeValue.to.minutes}`}
                    .locale=${this.locale}
                    @value-changed=${this._handleChangeTime}
                    .label=${this.localize(
                      "ui.components.date-range-picker.time_to"
                    )}
                    id="to"
                    placeholder-labels
                    auto-validate
                  ></ha-time-input>
                </div>
              `
            : nothing}
        </div>
      </div>
      <div class="footer">
        <ha-button appearance="plain" @click=${this._cancel}
          >${this.localize("ui.common.cancel")}</ha-button
        >
        <ha-button .disabled=${!this._dateValue} @click=${this._save}
          >${this.localize("ui.components.date-range-picker.select")}</ha-button
        >
      </div>`;
  }

  private _focusToday() {
    const date = new Date();
    this._focusDate = formatISODateOnly(date, this.locale, this.hassConfig);
    this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);
    this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);
  }

  private _cancel() {
    fireEvent(this, "cancel-date-picker");
  }

  private _save() {
    if (!this._dateValue) {
      return;
    }

    const dates = this._dateValue.split("/");
    let startDate = new Date(`${dates[0]}T00:00:00`);
    let endDate = new Date(`${dates[1]}T23:59:00`);

    if (this.timePicker) {
      const timeInputs = this._timeInputs;
      if (
        timeInputs &&
        ![...timeInputs].every((input) => input.reportValidity())
      ) {
        // If we have time inputs, and they don't all report valid, don't save
        return;
      }
      startDate.setHours(this._timeValue.from.hours);
      startDate.setMinutes(this._timeValue.from.minutes);
      endDate.setHours(this._timeValue.to.hours);
      endDate.setMinutes(this._timeValue.to.minutes);

      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
      endDate.setSeconds(0);
      endDate.setMilliseconds(0);

      if (endDate <= startDate) {
        endDate.setDate(startDate.getDate() + 1);
      }
    }

    if (this.locale.time_zone === TimeZone.server) {
      startDate = new Date(
        new TZDate(startDate, this.hassConfig.time_zone).getTime()
      );
      endDate = new Date(
        new TZDate(endDate, this.hassConfig.time_zone).getTime()
      );
    }

    if (
      startDate.getHours() !== this._timeValue.from.hours ||
      startDate.getMinutes() !== this._timeValue.from.minutes ||
      endDate.getHours() !== this._timeValue.to.hours ||
      endDate.getMinutes() !== this._timeValue.to.minutes
    ) {
      this._timeValue.from.hours = startDate.getHours();
      this._timeValue.from.minutes = startDate.getMinutes();
      this._timeValue.to.hours = endDate.getHours();
      this._timeValue.to.minutes = endDate.getMinutes();
    }

    fireEvent(this, "value-changed", {
      value: {
        startDate,
        endDate,
      },
    });
  }

  private _focusChanged(ev: CustomEvent<Date>) {
    const date = ev.detail;
    this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);
    this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);
    this._focusDate = undefined;
  }

  private _handleChange(ev: CustomEvent) {
    const dateElement = ev.target as HTMLElementTagNameMap["calendar-range"];
    this._dateValue = dateElement.value;
    this._focusDate = undefined;
  }

  private _setDateRange(ev: CustomEvent<ActionDetail>) {
    const dateRange: [Date, Date] = Object.values(this.ranges!)[
      ev.detail.index
    ];
    fireEvent(this, "value-changed", {
      value: {
        startDate: dateRange[0],
        endDate: dateRange[1],
      },
    });
    fireEvent(this, "preset-selected", {
      index: ev.detail.index,
    });
  }

  private _handleChangeTime(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const time = ev.detail.value;
    const target = ev.target as HaBaseTimeInput;
    const type = target.id;
    if (time) {
      if (!this._timeValue) {
        this._timeValue = {
          from: { hours: 0, minutes: 0 },
          to: { hours: 23, minutes: 59 },
        };
      }
      const [hours, minutes] = time.split(":").map(Number);
      this._timeValue[type].hours = hours;
      this._timeValue[type].minutes = minutes;
    }
  }

  static styles = [
    datePickerStyles,
    dateRangePickerStyles,
    css`
      .picker {
        display: flex;
        flex-direction: row;
        min-height: 100px;
        flex: 1;
      }

      .date-range-ranges {
        border-right: 1px solid var(--divider-color);
        min-width: 140px;
        flex: 0 1 30%;
      }

      .range {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--ha-space-3);
        overflow-x: hidden;
      }

      @media only screen and (max-width: 460px) {
        .picker {
          flex-direction: column;
        }

        .date-range-ranges {
          flex-basis: 180px;
          border-bottom: 1px solid var(--divider-color);
          border-right: none;
          overflow-y: scroll;
        }

        .range {
          flex-basis: fit-content;
        }
      }

      .times {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2);
      }

      .footer {
        display: flex;
        justify-content: flex-end;
        padding: var(--ha-space-2);
        border-top: 1px solid var(--divider-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "date-range-picker": DateRangePicker;
  }

  interface HASSDomEvents {
    "cancel-date-picker": undefined;
    "preset-selected": { index: number };
  }
}
