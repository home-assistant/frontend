import type { LitElement } from "lit";
import { fireEvent } from "../common/dom/fire_event";
import type { Constructor } from "../types";
import type { HassDialogNext } from "./make-dialog-manager";

export const DialogMixin = <
  P = unknown,
  T extends Constructor<LitElement> = Constructor<LitElement>,
>(
  superClass: T
) =>
  class extends superClass implements HassDialogNext<P> {
    public dialogNext = true as const;

    declare public params?: P;

    public dialogAnchor?: Element;

    private _closePromise?: Promise<boolean>;

    private _closeResolve?: (value: boolean) => void;

    public closeDialog(_historyState?: any): Promise<boolean> | boolean {
      if (this._closePromise) {
        return this._closePromise;
      }

      const dialogElement = this.shadowRoot?.querySelector(
        "ha-adaptive-dialog, ha-dialog, ha-bottom-sheet"
      ) as { open: boolean } | null;

      if (dialogElement) {
        this._closePromise = new Promise<boolean>((resolve) => {
          this._closeResolve = resolve;
        });
        dialogElement.open = false;
      }
      return this._closePromise || true;
    }

    private _removeDialog = (ev) => {
      ev.stopPropagation();
      this._closeResolve?.(true);
      this._closePromise = undefined;
      this._closeResolve = undefined;
      this.remove();
    };

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("closed", this._removeDialog, { once: true });
    }

    disconnectedCallback() {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
      this.removeEventListener("closed", this._removeDialog);
      super.disconnectedCallback();
    }
  };
