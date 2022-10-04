import { mdiCalendar } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateNumeric } from "../common/datetime/format_date";
import { weekdayIndex } from "../common/datetime/weekday";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
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
@customElement("ha-date-input")
export class HaDateInput extends LitElement {
  @property({ attribute: false }) public locale!: HomeAssistant["locale"];

  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public label?: string;

  @property() public helper?: string;

  render() {
    return html`<ha-textfield
      .label=${this.label}
      .helper=${this.helper}
      .disabled=${this.disabled}
      iconTrailing
      helperPersistent
      @click=${this._openDialog}
      .value=${this.value
        ? formatDateNumeric(new Date(this.value), this.locale)
        : ""}
      .required=${this.required}
    >
      <ha-svg-icon slot="trailingIcon" .path=${mdiCalendar}></ha-svg-icon>
    </ha-textfield>`;
  }

  private _openDialog() {
    if (this.disabled) {
      return;
    }
    showDatePickerDialog(this, {
      min: "1970-01-01",
      value: this.value,
      onChange: (value) => this._valueChanged(value),
      locale: this.locale.language,
      firstWeekday: weekdayIndex(this.locale.first_weekday),
    });
  }

  private _valueChanged(value: string) {
    if (this.value !== value) {
      this.value = value;
      fireEvent(this, "change");
      fireEvent(this, "value-changed", { value });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-svg-icon {
        color: var(--secondary-text-color);
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-date-input": HaDateInput;
  }
}
