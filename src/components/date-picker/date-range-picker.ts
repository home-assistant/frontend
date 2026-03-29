import { TZDate } from "@date-fns/tz";
import { consume, type ContextType } from "@lit/context";
import type { ActionDetail } from "@material/mwc-list";
import { mdiCalendarToday } from "@mdi/js";
import "cally";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
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
import { debounce } from "../../common/util/debounce";
import { haStyleScrollbar } from "../../resources/styles";

@customElement("date-range-picker")
export class DateRangePicker extends LitElement {
  @property({ attribute: false }) public ranges?: DateRangePickerRanges | false;

  @property({ attribute: false }) public startDate?: Date;

  @property({ attribute: false }) public endDate?: Date;

  @property({ attribute: false }) public narrow?: boolean;

  @property({ type: Boolean, attribute: "fixed-height", reflect: true })
  public fixedHeight?: boolean;

  @property({ type: Boolean, attribute: "time-picker", reflect: true })
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

  /** internally set when this.narrow and available width is small */
  @property({ type: Boolean, reflect: true }) public compact?: boolean;

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

  private _resizeObserver?: ResizeObserver;

  private _measure() {
    this.compact = this.narrow && this.offsetWidth < 450;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measure(), 250, false)
      );
    }
    this._resizeObserver.observe(this);
  }

  private async _removeObserver(): Promise<void> {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  protected firstUpdated(): void {
    if (this.narrow) {
      this._attachObserver();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this.updateComplete.then(() => {
      if (this.narrow) {
        this._attachObserver();
      }
    });

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

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._removeObserver();
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this._measure();
    }
    if (changedProps.has("narrow")) {
      // Only observe size in narrow mode.
      if (this.narrow) {
        this._attachObserver();
      } else {
        this._removeObserver();
      }
    }
  }

  render() {
    return html`<div class="content">
      <div class="picker">
        ${this.ranges !== false && this.ranges
          ? html`<div class="date-range-ranges ha-scrollbar">
              <ha-list @action=${this._setDateRange} activatable>
                ${Object.keys(this.ranges).map(
                  (name) => html`<ha-list-item>${name}</ha-list-item>`
                )}
              </ha-list>
            </div>`
          : nothing}
        <div class="range ha-scrollbar">
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
      </div>
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
    this._dateValue = formatCallyDateRange(
      dateRange[0],
      dateRange[1],
      this.locale,
      this.hassConfig
    );
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
    const type = (ev.target as HaBaseTimeInput).id;
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
    haStyleScrollbar,
    css`
      :host {
        --date-picker-fixed-height: 510px;
      }
      :host([compact]) {
        --date-picker-fixed-height: 820px;
      }
      :host([time-picker]) {
        --time-picker-extra-height: 150px;
      }

      .content {
        display: flex;
        flex-direction: column;
      }

      :host([fixed-height]) .content {
        height: calc(
          min(
            var(
              --ha-bottom-sheet-max-height,
              90vh - max(var(--safe-area-inset-bottom), 32px)
            ),
            var(--date-picker-fixed-height) +
              var(--time-picker-extra-height, 0px)
          )
        );
      }

      .picker {
        display: flex;
        flex-direction: row;
        min-height: 100px;
        flex: 1;
      }

      :host([compact]) .picker {
        flex-direction: column;
      }

      .date-range-ranges {
        border-right: 1px solid var(--divider-color);
        min-width: 140px;
        flex: 0 1 30%;
      }

      :host([compact]) .date-range-ranges {
        flex: 1 0 130px;
        border-bottom: 1px solid var(--divider-color);
        border-right: none;
        overflow-y: scroll;
      }

      .range {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--ha-space-3);
        flex: 1 1 fit-content;
        overflow-x: hidden;
      }

      :host([compact]) .range {
        flex: 0 1 fit-content;
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
        flex: 0 0 fit-content;
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
