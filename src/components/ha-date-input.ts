import { mdiCalendar } from "@mdi/js";
import type { HassConfig } from "home-assistant-js-websocket";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { firstWeekdayIndex } from "../common/datetime/first_weekday";
import { formatDateNumeric } from "../common/datetime/format_date";
import { fireEvent } from "../common/dom/fire_event";
import { TimeZone } from "../data/translation";
import type { HomeAssistant } from "../types";
import "./ha-svg-icon";
import "./input/ha-input";
import type { HaInput } from "./input/ha-input";

const loadDatePickerDialog = () =>
  import("./date-picker/ha-dialog-date-picker");

export interface DatePickerDialogParams {
  value?: string;
  min?: string;
  max?: string;
  locale?: string;
  firstWeekday?: number;
  canClear?: boolean;
  onChange: (value: string | undefined) => void;
}

const showDatePickerDialog = (
  element: HTMLElement,
  dialogParams: DatePickerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-date-picker",
    dialogImport: loadDatePickerDialog,
    dialogParams,
  });
};
@customElement("ha-date-input")
export class HaDateInput extends LitElement {
  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public value?: string;

  @property() public min?: string;

  @property() public max?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: "can-clear", type: Boolean }) public canClear = false;

  @query("ha-input", true) private _input?: HaInput;

  public reportValidity(): boolean {
    return this._input?.reportValidity() ?? true;
  }

  render() {
    return html`<ha-input
      .label=${this.label ?? ""}
      .hint=${this.helper ?? ""}
      .disabled=${this.disabled}
      readonly
      @click=${this._openDialog}
      @keydown=${this._keyDown}
      .value=${this.value
        ? formatDateNumeric(
            new Date(`${this.value.split("T")[0]}T00:00:00`),
            {
              ...this.locale,
              time_zone: TimeZone.local,
            },
            {} as HassConfig
          )
        : ""}
      .required=${this.required}
    >
      <ha-svg-icon slot="end" .path=${mdiCalendar}></ha-svg-icon>
    </ha-input>`;
  }

  private _openDialog() {
    if (this.disabled) {
      return;
    }
    showDatePickerDialog(this, {
      min: this.min || "1970-01-01",
      max: this.max,
      value: this.value,
      canClear: this.canClear,
      onChange: (value) => this._valueChanged(value),
      locale: this.locale.language,
      firstWeekday: firstWeekdayIndex(this.locale),
    });
  }

  private _keyDown(ev: KeyboardEvent) {
    if (["Space", "Enter"].includes(ev.code)) {
      ev.preventDefault();
      ev.stopPropagation();
      this._openDialog();
      return;
    }
    if (!this.canClear) {
      return;
    }
    if (["Backspace", "Delete"].includes(ev.key)) {
      this._valueChanged(undefined);
    }
  }

  private _valueChanged(value: string | undefined) {
    if (this.value !== value) {
      this.value = value;
      fireEvent(this, "change");
      fireEvent(this, "value-changed", { value });
    }
  }

  static styles = css`
    ha-svg-icon {
      color: var(--secondary-text-color);
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-date-input": HaDateInput;
  }
}
