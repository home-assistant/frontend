import "@material/mwc-button/mwc-button";
import "app-datepicker";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { haStyleDialog } from "../resources/styles";
import { datePickerDialogParams } from "./ha-date-input";
import "./ha-dialog";

@customElement("ha-dialog-date-picker")
export class HaDialogDatePicker extends LitElement {
  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _params?: datePickerDialogParams;

  @state() private _value?: string;

  public showDialog(params: datePickerDialogParams): void {
    this._params = params;
    this._value = params.value;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  render() {
    if (!this._params) {
      return html``;
    }
    return html`<ha-dialog open @closed=${this.closeDialog}>
      <app-datepicker
        .value=${this._value}
        .min=${this._params.min}
        .max=${this._params.max}
        .locale=${this._params.locale}
        @datepicker-value-updated=${this._valueChanged}
        .firstDayOfWeek=${this._params.firstWeekday}
      ></app-datepicker>
      <mwc-button slot="secondaryAction" @click=${this._setToday}
        >today</mwc-button
      >
      <mwc-button slot="primaryAction" dialogaction="cancel" class="cancel-btn">
        cancel
      </mwc-button>
      <mwc-button slot="primaryAction" @click=${this._setValue}>ok</mwc-button>
    </ha-dialog>`;
  }

  private _valueChanged(ev: CustomEvent) {
    this._value = ev.detail.value;
  }

  private _setToday() {
    this._value = new Date().toISOString().split("T")[0];
  }

  private _setValue() {
    this._params?.onChange(this._value!);
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: 0;
        --justify-action-buttons: space-between;
      }
      app-datepicker {
        --app-datepicker-accent-color: var(--primary-color);
        --app-datepicker-bg-color: transparent;
        --app-datepicker-color: var(--primary-text-color);
        --app-datepicker-disabled-day-color: var(--disabled-text-color);
        --app-datepicker-focused-day-color: var(--text-primary-color);
        --app-datepicker-focused-year-bg-color: var(--primary-color);
        --app-datepicker-selector-color: var(--secondary-text-color);
        --app-datepicker-separator-color: var(--divider-color);
        --app-datepicker-weekday-color: var(--secondary-text-color);
      }
      app-datepicker::part(calendar-day):focus {
        outline: none;
      }
      @media all and (min-width: 450px) {
        ha-dialog {
          --mdc-dialog-min-width: 300px;
        }
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        app-datepicker {
          width: 100%;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-date-picker": HaDialogDatePicker;
  }
}
