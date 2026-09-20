import type { LitElement, PropertyValues } from "lit";
import type { UnsavedChangesGuard } from "../common/navigate";
import {
  registerUnsavedChangesGuard,
  unregisterUnsavedChangesGuard,
} from "../common/navigate";
import type { Constructor } from "../types";

export const PreventUnsavedMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    /** Provided by `DirtyStateProviderMixin`. */
    declare isDirtyState: boolean;

    private _handleUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    private _unsavedChangesGuard: UnsavedChangesGuard = {
      isDirty: () => this.isDirtyState,
      prompt: () => this.promptDiscardChanges(),
    };

    public connectedCallback(): void {
      super.connectedCallback();

      registerUnsavedChangesGuard(this._unsavedChangesGuard);
    }

    protected willUpdate(changedProperties: PropertyValues<this>): void {
      super.willUpdate(changedProperties);

      if (this.isDirtyState && this.isConnected) {
        window.addEventListener("beforeunload", this._handleUnload);
      } else {
        window.removeEventListener("beforeunload", this._handleUnload);
      }
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();

      unregisterUnsavedChangesGuard(this._unsavedChangesGuard);
      window.removeEventListener("beforeunload", this._handleUnload);
    }

    protected async promptDiscardChanges(): Promise<boolean> {
      return true;
    }
  };
