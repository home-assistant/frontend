import { ContextProvider, createContext } from "@lit-labs/context";
import { LitElement } from "lit";
import { Constructor } from "../types";

export type ReorderMode = {
  active: boolean;
  enable: () => void;
  disable: () => void;
};
export const reorderModeContext = createContext<ReorderMode>("reorder-mode");

export const ReorderModeMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _reorderModeProvider = new ContextProvider(this, {
      context: reorderModeContext,
      initialValue: {
        active: false,
        enable: () => {
          this._reorderModeProvider.setValue({
            ...this._reorderModeProvider.value,
            active: true,
          });
          this.requestUpdate("_reorderMode");
        },
        disable: () => {
          this._reorderModeProvider.setValue({
            ...this._reorderModeProvider.value,
            active: false,
          });
          this.requestUpdate("_reorderMode");
        },
      },
    });

    get _reorderMode() {
      return this._reorderModeProvider.value;
    }
  };
