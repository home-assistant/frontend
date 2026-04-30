import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-form/ha-form";
import "../../components/ha-dialog-footer";
import "../../components/ha-dialog";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog, ShowDialogParams } from "../make-dialog-manager";
import type { FormDialogData, FormDialogParams } from "./show-form-dialog";

interface StackEntry {
  params: FormDialogParams;
  data: FormDialogData;
  nestedField?: string;
}

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

  @state() private _stack: StackEntry[] = [];

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
    this.addEventListener("show-dialog", this._handleNestedShowDialog);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("show-dialog", this._handleNestedShowDialog);
  }

  private _handleNestedShowDialog = (
    ev: HASSDomEvent<ShowDialogParams<unknown>>
  ) => {
    if (ev.detail.dialogTag !== "dialog-form") {
      return;
    }
    ev.stopPropagation();

    const origin = ev.composedPath()[0] as HTMLElement & { name?: string };
    this._stack = [
      ...this._stack,
      { params: this._params!, data: this._data, nestedField: origin?.name },
    ];
    const nested = ev.detail.dialogParams as FormDialogParams;
    this._params = nested;
    this._data = nested?.data || {};
  };

  private _popStack(): { hadStack: boolean; nestedField?: string } {
    if (!this._stack.length) {
      return { hadStack: false };
    }
    const prev = this._stack[this._stack.length - 1];
    this._stack = this._stack.slice(0, -1);
    this._params = prev.params;
    this._data = prev.data;
    return { hadStack: true, nestedField: prev.nestedField };
  }

  private _dialogClosed(): void {
    if (!this._closeState) {
      this._params?.cancel?.();
    }
    this._closeState = undefined;
    this._stack = [];
    this._params = undefined;
    this._data = {};
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    this._closeState = "submitted";
    const submit = this._params?.submit;
    const data = this._data;
    const { hadStack, nestedField } = this._popStack();

    submit?.(data);

    if (!hadStack) {
      this.closeDialog();
      return;
    }

    if (nestedField) {
      const schemaField = this._params?.schema.find(
        (f) => "selector" in f && f.name === nestedField
      );
      const isMultiple =
        schemaField &&
        "selector" in schemaField &&
        "object" in schemaField.selector &&
        schemaField.selector.object?.multiple === true;

      const current = this._data[nestedField];
      const newValue = isMultiple
        ? [...(Array.isArray(current) ? current : []), data]
        : data;

      this._data = structuredClone({ ...this._data, [nestedField]: newValue });
    } else {
      this._data = structuredClone({ ...this._data, ...data });
    }
  }

  private _cancel(): void {
    this._closeState = "canceled";
    const cancel = this._params?.cancel;
    const { hadStack } = this._popStack();

    cancel?.();

    if (!hadStack) {
      this.closeDialog();
      return;
    }

    this._data = structuredClone(this._data);
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
