import "@material/mwc-button/mwc-button";
import "app-datepicker";
import { format } from "date-fns";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import { haStyleDialog } from "../resources/styles";
import { HomeAssistant } from "../types";
import { datePickerDialogParams } from "./ha-date-input";
import "./ha-dialog";

@customElement("ha-dialog-date-picker")
export class HaDialogDatePicker extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _params?: datePickerDialogParams;

  @state() private _value?: string;

  public async showDialog(params: datePickerDialogParams): Promise<void> {
    // app-datepicker has a bug, that it removes its handlers when disconnected, but doesn't add them back when reconnected.
    // So we need to wait for the next render to make sure the element is removed and re-created so the handlers are added.
    await nextRender();
    this._params = params;
    this._value = params.value;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  render() {
    if (!this._params) {
      return nothing;
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
      <mwc-button slot="secondaryAction" @click=${this._setToday}>
        ${this.hass.localize("ui.dialogs.date-picker.today")}
      </mwc-button>
      <mwc-button slot="primaryAction" dialogaction="cancel" class="cancel-btn">
        ${this.hass.localize("ui.common.cancel")}
      </mwc-button>
      <mwc-button slot="primaryAction" @click=${this._setValue}>
        ${this.hass.localize("ui.common.ok")}
      </mwc-button>
    </ha-dialog>`;
  }

  private _valueChanged(ev: CustomEvent) {
    this._value = ev.detail.value;
  }

  private _setToday() {
    const today = new Date();
    this._value = format(today, "yyyy-MM-dd");
  }

  private _setValue() {
    if (!this._value) {
      // Date picker opens to today if value is undefined. If user click OK
      // without changing the date, should return todays date, not undefined.
      this._setToday();
    }
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
      app-datepicker::part(body) {
        direction: ltr;
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
