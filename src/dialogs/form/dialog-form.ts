import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-form/ha-form";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog, ShowDialogParams } from "../make-dialog-manager";
import type { FormDialogData, FormDialogParams } from "./show-form-dialog";

@customElement("dialog-form")
export class DialogForm
  extends LitElement
  implements HassDialog<FormDialogData>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: FormDialogParams;

  @state() private _data: FormDialogData = {};

  @state() private _open = false;

  @state() private _closeState?: "canceled" | "submitted";

  public async showDialog(params: FormDialogParams): Promise<void> {
    this._params = params;
    this._data = params.data || {};
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      "show-dialog",
      this._handleNestedShowDialog as unknown as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      "show-dialog",
      this._handleNestedShowDialog as unknown as EventListener
    );
  }

  private _handleNestedShowDialog = async (
    ev: CustomEvent<ShowDialogParams<unknown>>
  ) => {
    if (ev.detail.dialogTag !== "dialog-form") {
      return;
    }
    ev.stopPropagation();

    const { dialogImport, dialogParams } = ev.detail;
    if (dialogImport) {
      await dialogImport();
    }
    const nestedDialog = document.createElement("dialog-form") as DialogForm;
    nestedDialog.hass = this.hass;
    this.shadowRoot!.appendChild(nestedDialog);
    nestedDialog.showDialog(dialogParams as FormDialogParams);
    nestedDialog.addEventListener(
      "dialog-closed",
      () => {
        nestedDialog.remove();
      },
      { once: true }
    );
  };

  private _dialogClosed(): void {
    if (!this._closeState) {
      this._params?.cancel?.();
    }
    this._closeState = undefined;
    this._params = undefined;
    this._data = {};
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    this._closeState = "submitted";
    this._params?.submit?.(this._data);
    this.closeDialog();
  }

  private _cancel(): void {
    this._closeState = "canceled";
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
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this._params.title}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        <ha-form
          autofocus
          .hass=${this.hass}
          .computeLabel=${this._params.computeLabel}
          .computeHelper=${this._params.computeHelper}
          .data=${this._data}
          .schema=${this._params.schema}
          @value-changed=${this._valueChanged}
        >
        </ha-form>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this._params.cancelText || this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._submit}>
            ${this._params.submitText || this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
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
