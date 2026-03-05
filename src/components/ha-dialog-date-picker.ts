import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiBackspace, mdiCalendarToday } from "@mdi/js";
import "cally";
import { format } from "date-fns";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { haStyleDialog } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-button";
import type { DatePickerDialogParams } from "./ha-date-input";
import "./ha-dialog";
import "./ha-dialog-footer";
import "./ha-icon-button";
import "./ha-icon-button-next";
import "./ha-icon-button-prev";

type CalendarDate = HTMLElementTagNameMap["calendar-date"];

@customElement("ha-dialog-date-picker")
export class HaDialogDatePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _params?: DatePickerDialogParams;

  @state() private _open = false;

  @state() private _value?: {
    year: string;
    title: string;
    dateString: string;
  };

  @state() private _pickerMonth?: string;

  @state() private _pickerYear?: string;

  @state() private _focusDate?: string;

  public async showDialog(params: DatePickerDialogParams): Promise<void> {
    this._params = params;
    const date = params.value ? new Date(params.value) : new Date();
    this._value = params.value
      ? {
          year: format(date, "yyyy"),
          title: format(date, "EE, dd MMMM"),
          dateString: format(date, "yyyy-MM-dd"),
        }
      : undefined;
    this._pickerMonth = format(date, "MMMM");
    this._pickerYear = format(date, "yyyy");
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  render() {
    if (!this._params) {
      return nothing;
    }
    return html`<ha-dialog
      .hass=${this.hass}
      .open=${this._open}
      width="small"
      @closed=${this._dialogClosed}
      .headerTitle=${this._value?.title ||
      this.hass.localize("ui.dialogs.date-picker.title")}
      .headerSubtitle=${this._value?.year}
      header-subtitle-position="above"
    >
      ${this._params.canClear
        ? html`
            <ha-icon-button
              .path=${mdiBackspace}
              .label=${this.hass.localize("ui.dialogs.date-picker.clear")}
              slot="headerActionItems"
              @click=${this._clear}
            ></ha-icon-button>
          `
        : nothing}
      <wa-divider></wa-divider>
      <calendar-date
        .value=${this._value?.dateString}
        .min=${this._params.min}
        .max=${this._params.max}
        .locale=${this._params.locale}
        .firstDayOfWeek=${this._params.firstWeekday}
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
            .label=${this.hass.localize("ui.dialogs.date-picker.today")}
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
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button slot="primaryAction" @click=${this._setValue}>
          ${this.hass.localize("ui.common.ok")}
        </ha-button>
      </ha-dialog-footer>
    </ha-dialog>`;
  }

  private _valueChanged(ev: Event) {
    const dateElement = ev.target as CalendarDate;
    if (dateElement.value) {
      this._updateValue(new Date(dateElement.value));
    }
  }

  private _updateValue(date: Date, setFocusDay = false) {
    this._value = {
      year: format(date, "yyyy"),
      title: format(date, "EE, dd MMMM"),
      dateString: format(date, "yyyy-MM-dd"),
    };

    if (setFocusDay) {
      this._focusDate = this._value.dateString;
    }
  }

  private _focusChanged(ev: CustomEvent<Date>) {
    const date = ev.detail;
    this._pickerMonth = format(date, "MMMM");
    this._pickerYear = format(date, "yyyy");
    this._focusDate = undefined;
  }

  private _clear() {
    this._params?.onChange(undefined);
    this.closeDialog();
  }

  private _setToday() {
    this._updateValue(new Date(), true);
  }

  private _setValue() {
    if (!this._value) {
      // Date picker opens to today if value is undefined. If user click OK
      // without changing the date, should return todays date, not undefined.
      this._setToday();
    }
    this._params?.onChange(this._value?.dateString);
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
      }
      .bottom-actions {
        display: flex;
        gap: var(--ha-space-4);
        justify-content: center;
        align-items: center;
        width: 100%;
        margin-bottom: var(--ha-space-1);
      }
      calendar-date {
        width: 100%;
      }
      calendar-date::part(button) {
        border: none;
        background-color: unset;
        border-radius: var(--ha-border-radius-circle);
        outline-offset: -2px;
        outline-color: var(--ha-color-neutral-60);
      }

      calendar-month {
        width: 100%;
        margin: 0 auto;
        min-height: calc(42px * 7);
      }

      calendar-month::part(heading) {
        display: none;
      }
      calendar-month::part(day) {
        color: var(--disabled-text-color);
        font-size: var(--ha-font-size-m);
        font-family: var(--ha-font-body);
      }
      calendar-month::part(button),
      calendar-month::part(selected):focus-visible {
        color: var(--primary-text-color);
        height: 32px;
        width: 32px;
        margin: var(--ha-space-1);
        border-radius: var(--ha-border-radius-circle);
      }
      calendar-month::part(button):focus-visible {
        background-color: inherit;
        outline: 1px solid var(--ha-color-neutral-60);
        outline-offset: 2px;
      }
      calendar-month::part(button):hover {
        background-color: var(--ha-color-fill-primary-quiet-hover);
      }
      calendar-month::part(today) {
        color: var(--primary-color);
      }
      calendar-month::part(selected),
      calendar-month::part(selected):hover {
        color: var(--text-primary-color);
        background-color: var(--primary-color);
        height: 40px;
        width: 40px;
        margin: 0;
      }
      calendar-month::part(selected):focus-visible {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }

      .heading {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
      }
      .month-year {
        flex: 1;
        text-align: center;
        margin-left: 48px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-date-picker": HaDialogDatePicker;
  }
}
