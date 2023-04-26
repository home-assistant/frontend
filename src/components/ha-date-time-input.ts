import { mdiCalendar } from "@mdi/js";
import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateNumeric } from "../common/datetime/format_date";
import { firstWeekdayIndex } from "../common/datetime/first_weekday";
import { useAmPm } from "../common/datetime/use_am_pm";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-base-time-input";
import type { TimeChangedEvent } from "./ha-base-time-input";
import "./ha-svg-icon";
import "./ha-textfield";

const loadDatePickerDialog = () => import("./ha-dialog-date-picker");

export interface datePickerDialogParams {
  value?: string;
  min?: string;
  max?: string;
  locale?: string;
  firstWeekday?: number;
  onChange: (value: string) => void;
}

const showDatePickerDialog = (
  element: HTMLElement,
  dialogParams: datePickerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-date-picker",
    dialogImport: loadDatePickerDialog,
    dialogParams,
  });
};

@customElement("ha-date-time-input")
export class HaDateTimeInput extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public label?: string;

  @property() public value?: string;

  @property() public min?: string;

  @property() public max?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "enable-date" }) public enableDate =
    false;

  @property({ type: Boolean, attribute: "enable-time" }) public enableTime =
    false;

  @property({ type: Boolean, attribute: "enable-second" }) public enableSecond =
    false;

  @property() private time_value?: any;

  @property() private date_value?: any;

  protected update(changedProps: PropertyValues) {
    if (changedProps.has("value")) {
      const parts = this.value?.split(" ") || [];
      this.date_value = parts.length > 0 ? parts[0] : null;
      this.time_value = parts.length > 0 ? parts[parts.length - 1] : null;
    }
    super.update(changedProps);
  }

  protected render() {
    const itemTemplates: TemplateResult[] = [];
    if (this.enableDate) {
      itemTemplates.push(
        html`<ha-textfield
          .label=${this.label}
          .disabled=${this.disabled}
          iconTrailing
          helperPersistent
          readonly
          @click=${this._openDialog}
          .value=${this.date_value
            ? formatDateNumeric(
                new Date(`${this.date_value.split("T")[0]}T00:00:00`),
                this.locale
              )
            : ""}
          .required=${this.required}
        >
          <ha-svg-icon slot="trailingIcon" .path=${mdiCalendar}></ha-svg-icon>
        </ha-textfield>`
      );
    }
    if (this.enableTime) {
      const useAMPM = useAmPm(this.locale);
      const parts = this.time_value?.split(":");
      let hours = parts?.[0];
      const numberHours = Number(hours);
      if (numberHours && useAMPM && numberHours > 12 && numberHours < 24) {
        hours = String(numberHours - 12).padStart(2, "0");
      }
      if (useAMPM && numberHours === 0) {
        hours = "12";
      }
      itemTemplates.push(
        html`<ha-base-time-input
          .label=${this.enableDate ? undefined : this.label}
          .hours=${Number(hours)}
          .minutes=${Number(parts?.[1])}
          .seconds=${Number(parts?.[2])}
          .format=${useAMPM ? 12 : 24}
          .amPm=${useAMPM && numberHours >= 12 ? "PM" : "AM"}
          .disabled=${this.disabled}
          @value-changed=${this._timeChanged}
          .enableSecond=${this.enableSecond}
          .required=${this.required}
        ></ha-base-time-input>`
      );
    }
    if (this.helper) {
      itemTemplates.push(
        html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      );
    }
    return html` <div class="input">${itemTemplates}</div>`;
  }

  private _openDialog() {
    if (this.disabled) {
      return;
    }
    showDatePickerDialog(this, {
      min: this.min || "1970-01-01",
      max: this.max,
      value: this.value,
      onChange: (value) => this._dateChanged(value),
      locale: this.locale.language,
      firstWeekday: firstWeekdayIndex(this.locale),
    });
  }

  private _valueChanged() {
    const value = `${
      this.enableDate && Boolean(this.date_value) ? this.date_value : ""
    } ${
      this.enableTime && Boolean(this.time_value) ? this.time_value : ""
    }`.trim();
    if (this.value !== value) {
      this.value = value;
      const OK =
        !this.enableDate ||
        !this.enableTime ||
        (Boolean(this.date_value) && Boolean(this.time_value));
      if (OK) {
        setTimeout(() => {
          fireEvent(this, "value-changed", { value });
          fireEvent(this, "change");
        });
      }
    }
  }

  private _dateChanged(value: string) {
    if (value !== this.date_value) {
      this.date_value = value;
      this._valueChanged();
    }
  }

  private _timeChanged(ev: CustomEvent<{ value: TimeChangedEvent }>) {
    ev.stopPropagation();
    const eventValue = ev.detail.value;
    const useAMPM = useAmPm(this.locale);
    let value;

    if (
      !isNaN(eventValue.hours) ||
      !isNaN(eventValue.minutes) ||
      !isNaN(eventValue.seconds)
    ) {
      let hours = eventValue.hours || 0;
      if (eventValue && useAMPM) {
        if (eventValue.amPm === "PM" && hours < 12) {
          hours += 12;
        }
        if (eventValue.amPm === "AM" && hours === 12) {
          hours = 0;
        }
      }
      value = `${hours.toString().padStart(2, "0")}:${
        eventValue.minutes
          ? eventValue.minutes.toString().padStart(2, "0")
          : "00"
      }:${
        eventValue.seconds
          ? eventValue.seconds.toString().padStart(2, "0")
          : "00"
      }`;
    }
    if (value && value !== this.time_value) {
      this.time_value = value;
      this._valueChanged();
    }
  }

  static override styles = css`
    div {
      margin-top: 4px;
    }
    .input {
      display: flex;
      align-items: center;
      flex-direction: row;
    }
    ha-svg-icon {
      color: var(--secondary-text-color);
    }
    ha-textfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-date-time-input": HaDateTimeInput;
  }
}
