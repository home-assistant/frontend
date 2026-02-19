import type { LitElement } from "lit";
import { fireEvent } from "../common/dom/fire_event";
import type { HaDialog } from "../components/ha-dialog";
import type { Constructor } from "../types";
import type { HassDialogNext } from "./make-dialog-manager";

export const DialogMixin = <T extends Constructor<LitElement>>(superClass: T) =>
  class extends superClass implements HassDialogNext {
    private _closePromise?: Promise<boolean>;

    private _closeResolve?: (value: boolean) => void;

    public closeDialog(_historyState?: any): Promise<boolean> | boolean {
      if (this._closePromise) {
        return this._closePromise;
      }

      const dialogElement = this.shadowRoot?.querySelector(
        "ha-dialog"
      ) as HaDialog | null;
      if (dialogElement) {
        this._closePromise = new Promise<boolean>((resolve) => {
          this._closeResolve = resolve;
        });
        dialogElement.open = false;
      }
      return this._closePromise || true;
    }

    private _removeDialog = () => {
      this._closeResolve?.(true);
      this._closePromise = undefined;
      this._closeResolve = undefined;
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    };

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener("closed", this._removeDialog, { once: true });
    }

    disconnectedCallback() {
      this.removeEventListener("closed", this._removeDialog);
      super.disconnectedCallback();
    }
  };
