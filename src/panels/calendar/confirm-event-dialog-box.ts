import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  fireEvent,
  HASSDomCurrentTargetEvent,
} from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/radio/ha-radio-group";
import type { HaRadioGroup } from "../../components/radio/ha-radio-group";
import "../../components/radio/ha-radio-option";
import { RecurrenceRange } from "../../data/calendar";
import type { HomeAssistant } from "../../types";
import type { ConfirmEventDialogBoxParams } from "./show-confirm-event-dialog-box";

// `RecurrenceRange.THISEVENT` is "", which the radio group treats as unselected
// on its value-attribute and form-reset paths, so keep the options on their own
// literals and map them when confirming.
type RecurrenceScope = "this" | "future";

@customElement("confirm-event-dialog-box")
class ConfirmEventDialogBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ConfirmEventDialogBoxParams;

  @state() private _open = false;

  @state() private _closeState?: "canceled" | "confirmed";

  @state() private _scope: RecurrenceScope = "this";

  public async showDialog(params: ConfirmEventDialogBoxParams): Promise<void> {
    this._params = params;
    this._scope = "this";
    this._closeState = undefined;
    this._open = true;
  }

  public closeDialog(): boolean {
    if (!this._open) {
      return true;
    }
    this._open = false;
    return true;
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const { destructive, recurring } = this._params;

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this._params.title}
        width="small"
        type="alert"
        aria-describedby=${recurring ? nothing : "description"}
        @closed=${this._dialogClosed}
      >
        ${
          recurring
            ? this._renderRecurrenceRange()
            : html`<p id="description">${this._params.text}</p>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            @click=${this._dismiss}
            ?autofocus=${!recurring && destructive}
            slot="secondaryAction"
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._confirm}
            ?autofocus=${!recurring && !destructive}
            variant=${destructive ? "danger" : "brand"}
          >
            ${this._params.confirmText}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderRecurrenceRange() {
    const thisEvent = this.hass.localize(
      "ui.components.calendar.event.recurrence_range.this_event"
    );
    const thisAndFuture = this.hass.localize(
      "ui.components.calendar.event.recurrence_range.this_and_future"
    );

    return html`
      <ha-radio-group
        name="recurrence_range"
        .label=${this._params!.text ?? this._params!.title}
        .value=${this._scope}
        @change=${this._scopeChanged}
      >
        <ha-radio-option value="this" autofocus>${thisEvent}</ha-radio-option>
        <ha-radio-option value="future">${thisAndFuture}</ha-radio-option>
      </ha-radio-group>
    `;
  }

  private _scopeChanged(ev: HASSDomCurrentTargetEvent<HaRadioGroup>): void {
    this._scope = ev.currentTarget.value as RecurrenceScope;
  }

  private _dismiss(): void {
    this._closeState = "canceled";
    this.closeDialog();
  }

  private _confirm(): void {
    this._closeState = "confirmed";
    this._params!.confirm?.(
      this._scope === "future"
        ? RecurrenceRange.THISANDFUTURE
        : RecurrenceRange.THISEVENT
    );
    this.closeDialog();
  }

  private _dialogClosed(): void {
    if (!this._params) {
      return;
    }
    if (this._closeState !== "confirmed") {
      this._params.cancel?.();
    }
    this._params = undefined;
    this._open = false;
    this._closeState = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static styles = css`
    :host([inert]) {
      pointer-events: initial !important;
      cursor: initial !important;
    }
    p {
      margin: 0;
      color: var(--primary-text-color);
    }
    ha-radio-group::part(form-control-label) {
      font-weight: var(--ha-font-weight-medium);
    }
    ha-dialog {
      /* Place above other dialogs */
      --dialog-z-index: 104;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "confirm-event-dialog-box": ConfirmEventDialogBox;
  }
}
