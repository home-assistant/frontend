import { css, html, LitElement, nothing } from "lit";
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from "lit/decorators";
import deepClone from "deep-clone-simple";
import { deepActiveElement } from "../../common/dom/deep-active-element";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import { nextRender } from "../../common/util/render-status";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-form/ha-form";
import type { HaDialog } from "../../components/ha-dialog";
import type { HaForm } from "../../components/ha-form/ha-form";
import { DirtyStateProviderMixin } from "../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { HassDialog, ShowDialogParams } from "../make-dialog-manager";
import type { FormDialogData, FormDialogParams } from "./show-form-dialog";

interface StackEntry {
  params: FormDialogParams;
  initialData: FormDialogData;
  data: FormDialogData;
  scrollTop: number;
  focusTarget?: Element;
  error?: Record<string, string>;
}

@customElement("dialog-form")
export class DialogForm
  extends DirtyStateProviderMixin<FormDialogData[]>()(LitElement)
  implements HassDialog<FormDialogData>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: FormDialogParams;

  @state() private _data: FormDialogData = {};

  private _initialData: FormDialogData = {};

  @state() private _open = false;

  @state() private _closeState?: "canceled" | "submitted";

  @state() private _stack: StackEntry[] = [];

  @state() private _error?: Record<string, string>;

  @query("ha-dialog") private _dialog?: HaDialog;

  @query("ha-form:not([hidden])") private _form?: HaForm;

  @queryAll("ha-form") private _forms!: NodeListOf<HaForm>;

  public async showDialog(params: FormDialogParams): Promise<void> {
    this._params = params;
    this._data = params.data || {};
    this._initialData = deepClone(this._data);
    this._open = true;
    this._error = undefined;
    this._resetDirtyTracking();
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _initialDirtyState(): FormDialogData[] {
    return [
      ...this._stack.map((entry) => entry.initialData),
      this._initialData,
    ];
  }

  private _currentDirtyState(): FormDialogData[] {
    return [...this._stack.map((entry) => entry.data), this._data];
  }

  private _resetDirtyTracking(): void {
    this._initDirtyTracking({ type: "deep" }, this._initialDirtyState());
    this._updateDirtyState(this._currentDirtyState());
  }

  private _handleNestedShowDialog = (
    ev: HASSDomEvent<ShowDialogParams<unknown>>
  ) => {
    if (
      ev.detail.dialogTag !== "dialog-form" ||
      ev.currentTarget !== this._form
    ) {
      return;
    }

    const nested = ev.detail.dialogParams as FormDialogParams;
    if (!nested.submit || !nested.cancel) {
      return;
    }

    ev.stopPropagation();
    const focusTarget = deepActiveElement();

    this._stack = [
      ...this._stack,
      {
        params: this._params!,
        initialData: this._initialData,
        data: this._data,
        scrollTop: this._dialog?.bodyContainer.scrollTop ?? 0,
        focusTarget: focusTarget ?? undefined,
        error: this._error,
      },
    ];

    this._params = nested;
    this._data = nested.data || {};
    this._initialData = deepClone(this._data);
    this._error = undefined;
    this._resetDirtyTracking();
    void this._focusActiveForm(nested);
  };

  private _popStack(): StackEntry | undefined {
    if (!this._stack.length) {
      return undefined;
    }

    const prev = this._stack[this._stack.length - 1];

    this._stack = this._stack.slice(0, -1);
    this._params = prev.params;
    this._initialData = prev.initialData;
    this._data = prev.data;
    this._error = prev.error;
    this._resetDirtyTracking();

    return prev;
  }

  private async _afterFormRender(): Promise<void> {
    await this.updateComplete;
    await this._form?.updateComplete;
    await nextRender();
  }

  private async _waitForSelectorElements(): Promise<void> {
    const selectors = this._form?.shadowRoot?.querySelectorAll("ha-selector");
    if (selectors?.length) {
      await Promise.all(
        Array.from(selectors, (element) =>
          "updateComplete" in element
            ? (element as LitElement).updateComplete
            : undefined
        )
      );
    }

    const pending = this._undefinedCustomElements(this._form);
    if (!pending.length) {
      return;
    }

    await Promise.all(pending.map((tag) => customElements.whenDefined(tag)));
    await nextRender();
  }

  private _undefinedCustomElements(root?: ParentNode): string[] {
    const tags = new Set<string>();
    const visit = (node: ParentNode) => {
      if (node instanceof Element && node.shadowRoot) {
        visit(node.shadowRoot);
      }
      for (const child of node.children) {
        if (
          child.localName.includes("-") &&
          !customElements.get(child.localName)
        ) {
          tags.add(child.localName);
        }
        visit(child);
      }
    };
    if (root) {
      visit(root);
    }
    return [...tags];
  }

  private _focusFirstControl(root = this._form): void {
    if (!root) {
      return;
    }

    const visit = (node: ParentNode): HTMLElement | undefined => {
      if (node instanceof Element && node.shadowRoot) {
        const inShadow = visit(node.shadowRoot);
        if (inShadow) {
          return inShadow;
        }
      }

      for (const child of node.children) {
        if (
          child instanceof HTMLElement &&
          child.matches("input, textarea, select, button")
        ) {
          return child;
        }
        const found = visit(child);
        if (found) {
          return found;
        }
      }

      return undefined;
    };

    visit(root)?.focus();
  }

  private async _focusActiveForm(
    expectedParams: FormDialogParams
  ): Promise<void> {
    await this._afterFormRender();

    if (!this.isConnected || !this._open || this._params !== expectedParams) {
      return;
    }

    await this._waitForSelectorElements();

    if (!this.isConnected || !this._open || this._params !== expectedParams) {
      return;
    }

    this._focusFirstControl();
  }

  private async _restoreFocusAndScroll(
    scrollTop: number,
    expectedParams: FormDialogParams,
    focusTarget?: Element
  ): Promise<void> {
    await this._afterFormRender();

    if (
      !this.isConnected ||
      !this._open ||
      this._params !== expectedParams ||
      !this._dialog
    ) {
      return;
    }

    if (focusTarget instanceof HTMLElement && focusTarget.isConnected) {
      focusTarget.focus();
    } else {
      this._focusFirstControl();
    }

    this._dialog.bodyContainer.scrollTop = scrollTop;
  }

  private _dialogClosed(): void {
    if (!this._closeState) {
      this._params?.cancel?.();

      for (let index = this._stack.length - 1; index >= 0; index--) {
        this._stack[index].params.cancel?.();
      }
    }

    if (this._closeState !== "submitted") {
      this._discardDirtyStateChanges();
    }

    this._closeState = undefined;
    this._stack = [];
    this._params = undefined;
    this._initialData = {};
    this._data = {};
    this._open = false;
    this._error = undefined;

    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    if (this._form && !this._form.reportValidity()) {
      this._error = {
        base: this.hass!.localize("ui.components.form.validation_failed"),
      };
      return;
    }

    const validationError = this._params?.validate?.(this._data);
    if (validationError && Object.keys(validationError).length) {
      this._error = validationError;
      return;
    }

    const submit = this._params?.submit;
    const data = this._data;
    const stackEntry = this._popStack();

    if (!stackEntry) {
      this._closeState = "submitted";
      submit?.(data);
      this._markDirtyStateClean();
      this.closeDialog();
      return;
    }

    submit!(data);
    void this._restoreFocusAndScroll(
      stackEntry.scrollTop,
      stackEntry.params,
      stackEntry.focusTarget
    );
  }

  private _cancel(): void {
    const cancel = this._params?.cancel;
    const stackEntry = this._popStack();

    if (!stackEntry) {
      this._closeState = "canceled";
      cancel?.();
      this.closeDialog();
      return;
    }

    cancel!();
    void this._restoreFocusAndScroll(
      stackEntry.scrollTop,
      stackEntry.params,
      stackEntry.focusTarget
    );
  }

  private _valueChanged(ev: CustomEvent): void {
    const levelIndex = Array.from(this._forms).indexOf(
      ev.currentTarget as HaForm
    );

    if (levelIndex === -1) {
      return;
    }

    const data = ev.detail.value as FormDialogData;

    if (levelIndex === this._stack.length) {
      this._data = data;
      this._error = undefined;
      this._updateDirtyState(this._currentDirtyState());
      return;
    }

    if (levelIndex < this._stack.length) {
      this._stack = this._stack.map((entry, index) =>
        index === levelIndex ? { ...entry, data, error: undefined } : entry
      );
      this._updateDirtyState(this._currentDirtyState());
    }
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    const params = this._params;
    const levels = [
      ...this._stack,
      {
        params,
        initialData: this._initialData,
        data: this._data,
        error: this._error,
      },
    ];

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${params.title}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        ${levels.map((level, index) => {
          const isActive = index === levels.length - 1;

          return html`
            <ha-form
              ?hidden=${!isActive}
              ?autofocus=${isActive}
              .hass=${this.hass}
              .computeLabel=${level.params.computeLabel}
              .computeHelper=${level.params.computeHelper}
              .data=${level.data}
              .schema=${level.params.schema}
              .error=${level.error}
              @value-changed=${this._valueChanged}
              @show-dialog=${this._handleNestedShowDialog}
            >
            </ha-form>
          `;
        })}
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${params.cancelText || this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._submit}>
            ${params.submitText || this.hass.localize("ui.common.save")}
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
