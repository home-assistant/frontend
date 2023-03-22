import "@material/mwc-button/mwc-button";
import "app-datepicker";
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
      <app-date-picker
        .value=${this._value}
        .min=${this._params.min}
        .max=${this._params.max}
        .locale=${this._params.locale}
        @date-updated=${this._valueChanged}
        .firstDayOfWeek=${this._params.firstWeekday}
      ></app-date-picker>
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
    // en-CA locale used for date format YYYY-MM-DD
    this._value = new Date().toLocaleDateString("en-CA");
  }

  private _setValue() {
    this._params?.onChange(this._value!);
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --justify-action-buttons: space-between;
      }
      app-date-picker {
        --app-focus: var(--primary-text-color);
        --app-hover: var(--primary-color);
        --app-on-disabled: var(--disabled-color);
        --app-on-focus: var(--primary-text-color);
        --app-on-hover: var(--primary-text-color);
        --app-on-primary: var(--text-primary-color);
        --app-on-surface: var(--primary-text-color);
        --app-on-today: var(--primary-text-color);
        --app-on-week-number: var(--secondary-text-color);
        --app-on-weekday: var(--secondary-text-color);
        --app-primary: var(--primary-color);
        --app-selected-focus: var(--primary-text-color);
        --app-selected-hover: var(--primary-color);
        --app-selected-on-focus: var(--text-primary-color);
        --app-selected-on-hover: var(--text-primary-color);
        --app-shape: var(--mdc-shape-medium);
        --app-surface: transparent;
        --app-today: var(--primary-text-color);

        margin: auto;
      }
      ha-dialog {
        --mdc-dialog-min-width: 300px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-date-picker": HaDialogDatePicker;
  }
}
