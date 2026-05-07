import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume, type ContextType } from "@lit/context";
import { mdiBackspace, mdiCalendarToday } from "@mdi/js";
import "cally";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import {
  formatDateMonth,
  formatDateShort,
  formatDateYear,
  formatISODateOnly,
} from "../../common/datetime/format_date";
import {
  configContext,
  localeContext,
  localizeContext,
} from "../../data/context";
import { DialogMixin } from "../../dialogs/dialog-mixin";
import "../ha-button";
import type { DatePickerDialogParams } from "../ha-date-input";
import "../ha-dialog";
import "../ha-dialog-footer";
import "../ha-icon-button";
import "../ha-icon-button-next";
import "../ha-icon-button-prev";
import { datePickerStyles } from "./styles";

type CalendarDate = HTMLElementTagNameMap["calendar-date"];

/**
 * A date picker dialog component that displays a calendar for selecting dates.
 * Uses the `cally` library for calendar rendering and supports localization,
 * min/max date constraints, and optional clearing of the selected date.
 *
 * @element ha-dialog-date-picker
 * Uses {@link DialogMixin} with {@link DatePickerDialogParams} to manage dialog state and parameters.
 */
@customElement("ha-dialog-date-picker")
export class HaDialogDatePicker extends DialogMixin<DatePickerDialogParams>(
  LitElement
) {
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: localeContext, subscribe: true })
  private locale!: ContextType<typeof localeContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private hassConfig!: ContextType<typeof configContext>;

  @state() private _value?: {
    year: string;
    title: string;
    dateString: string;
  };

  /** used to show month in calendar-date header */
  @state() private _pickerMonth?: string;

  /** used to show year in calendar-date header */
  @state() private _pickerYear?: string;

  /** used for today to navigate focus in cally-calendar-date  */
  @state() private _focusDate?: string;

  public connectedCallback() {
    super.connectedCallback();

    if (this.params) {
      const date = this.params.value
        ? new Date(`${this.params.value.split("T")[0]}T00:00:00`)
        : new Date();

      this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);
      this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);

      this._value = this.params.value
        ? {
            year: this._pickerYear,
            title: formatDateShort(date, this.locale, this.hassConfig),
            dateString: formatISODateOnly(date, this.locale, this.hassConfig),
          }
        : undefined;
    }
  }

  render() {
    if (!this.params) {
      return nothing;
    }
    return html`<ha-dialog
      open
      width="small"
      .headerTitle=${this._value?.title ||
      this.localize("ui.dialogs.date-picker.title")}
      .headerSubtitle=${this._value?.year}
      header-subtitle-position="above"
    >
      ${this.params.canClear
        ? html`
            <ha-icon-button
              .path=${mdiBackspace}
              .label=${this.localize("ui.dialogs.date-picker.clear")}
              slot="headerActionItems"
              @click=${this._clear}
            ></ha-icon-button>
          `
        : nothing}
      <wa-divider></wa-divider>
      <calendar-date
        .value=${this._value?.dateString}
        .min=${this.params.min}
        .max=${this.params.max}
        .locale=${this.params.locale}
        .firstDayOfWeek=${this.params.firstWeekday}
        .focusedDate=${this._focusDate}
        @change=${this._valueChanged}
        @focusday=${this._focusChanged}
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
            @click=${this._setToday}
            .path=${mdiCalendarToday}
            .label=${this.localize("ui.dialogs.date-picker.today")}
          ></ha-icon-button>
        </div>
        <ha-icon-button-next tabindex="-1" slot="next"></ha-icon-button-next>
        <calendar-month></calendar-month>
      </calendar-date>
      <ha-dialog-footer slot="footer">
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this.localize("ui.common.cancel")}
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._setValue}>
          ${this.localize("ui.common.ok")}
        </ha-button>
      </ha-dialog-footer>
    </ha-dialog>`;
  }

  private _valueChanged(ev: Event) {
    const dateElement = ev.target as CalendarDate;
    if (dateElement.value) {
      this._updateValue(dateElement.value);
    }
  }

  private _updateValue(value?: string, setFocusDay = false) {
    const date = value
      ? new Date(`${value.split("T")[0]}T00:00:00`)
      : new Date();
    this._value = {
      year: formatDateYear(date, this.locale, this.hassConfig),
      title: formatDateShort(date, this.locale, this.hassConfig),
      dateString:
        value || formatISODateOnly(date, this.locale, this.hassConfig),
    };

    if (setFocusDay) {
      this._focusDate = this._value.dateString;
      this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);
      this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);
    }
  }

  private _focusChanged(ev: CustomEvent<Date>) {
    const date = ev.detail;
    this._pickerMonth = formatDateMonth(date, this.locale, this.hassConfig);
    this._pickerYear = formatDateYear(date, this.locale, this.hassConfig);
    this._focusDate = undefined;
  }

  private _clear() {
    this.params?.onChange(undefined);
    this.closeDialog();
  }

  private _setToday() {
    this._updateValue(undefined, true);
  }

  private _setValue() {
    if (!this._value) {
      // Date picker opens to today if value is undefined. If user click OK
      // without changing the date, should return todays date, not undefined.
      this._setToday();
    }
    this.params?.onChange(this._value?.dateString);
    this.closeDialog();
  }

  static styles = [
    datePickerStyles,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-date-picker": HaDialogDatePicker;
  }
}
