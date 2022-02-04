import { mdiCalendar } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateNumeric } from "../common/datetime/format_date";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

const loadDatePickerDialog = () => import("./ha-dialog-date-picker");

export interface datePickerDialogParams {
  value?: string;
  min?: string;
  max?: string;
  locale?: string;
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

  @property() public label?: string;

  render() {
    return html`<paper-input
      .label=${this.label}
      .disabled=${this.disabled}
      no-label-float
      @click=${this._openDialog}
      .value=${this.value
        ? formatDateNumeric(new Date(this.value), this.locale)
        : ""}
    >
      <ha-svg-icon slot="suffix" .path=${mdiCalendar}></ha-svg-icon>
    </paper-input>`;
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
      paper-input {
        width: 110px;
      }
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
