import "app-datepicker";
import { format } from "date-fns";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import { haStyleDialog } from "../resources/styles";
import type { HomeAssistant } from "../types";
import type { DatePickerDialogParams } from "./ha-date-input";
import "./ha-button";
import "./ha-dialog-footer";
import "./ha-wa-dialog";

@customElement("ha-dialog-date-picker")
export class HaDialogDatePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: string;

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @state() private _params?: DatePickerDialogParams;

  @state() private _open = false;

  @state() private _value?: string;

  public async showDialog(params: DatePickerDialogParams): Promise<void> {
    // app-datepicker has a bug, that it removes its handlers when disconnected, but doesn't add them back when reconnected.
    // So we need to wait for the next render to make sure the element is removed and re-created so the handlers are added.
    await nextRender();
    this._params = params;
    this._value = params.value;
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
    return html`<ha-wa-dialog
      .hass=${this.hass}
      .open=${this._open}
      width="small"
      without-header
      @closed=${this._dialogClosed}
    >
      <app-datepicker
        .value=${this._value}
        .min=${this._params.min}
        .max=${this._params.max}
        .locale=${this._params.locale}
        @datepicker-value-updated=${this._valueChanged}
        .firstDayOfWeek=${this._params.firstWeekday}
      ></app-datepicker>

      <div class="bottom-actions">
        ${this._params.canClear
          ? html`<ha-button
              slot="secondaryAction"
              @click=${this._clear}
              variant="danger"
              appearance="plain"
            >
              ${this.hass.localize("ui.dialogs.date-picker.clear")}
            </ha-button>`
          : nothing}
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this._setToday}
        >
          ${this.hass.localize("ui.dialogs.date-picker.today")}
        </ha-button>
      </div>

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
    </ha-wa-dialog>`;
  }

  private _valueChanged(ev: CustomEvent) {
    this._value = ev.detail.value;
  }

  private _clear() {
    this._params?.onChange(undefined);
    this.closeDialog();
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
      ha-wa-dialog {
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
      app-datepicker {
        display: block;
        margin-inline: auto;
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
