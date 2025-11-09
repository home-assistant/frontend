import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-form/ha-form";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog } from "../make-dialog-manager";
import type { FormDialogData, FormDialogParams } from "./show-form-dialog";

@customElement("dialog-form")
export class DialogForm
  extends LitElement
  implements HassDialog<FormDialogData>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: FormDialogParams;

  @state() private _data: FormDialogData = {};

  public async showDialog(params: FormDialogParams): Promise<void> {
    this._params = params;
    this._data = params.data || {};
  }

  public closeDialog() {
    this._params = undefined;
    this._data = {};
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  private _submit(): void {
    this._params?.submit?.(this._data);
    this.closeDialog();
  }

  private _cancel(): void {
    this._params?.cancel?.();
    this.closeDialog();
  }

  private _valueChanged(ev: CustomEvent): void {
    this._data = ev.detail.value;
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, this._params.title)}
        @closed=${this._cancel}
      >
        <ha-form
          dialogInitialFocus
          .hass=${this.hass}
          .computeLabel=${this._params.computeLabel}
          .computeHelper=${this._params.computeHelper}
          .data=${this._data}
          .schema=${this._params.schema}
          @value-changed=${this._valueChanged}
        >
        </ha-form>
        <ha-button
          appearance="plain"
          @click=${this._cancel}
          slot="secondaryAction"
        >
          ${this._params.cancelText || this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button @click=${this._submit} slot="primaryAction">
          ${this._params.submitText || this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  static styles = [haStyleDialog, css``];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-form": DialogForm;
  }
}
