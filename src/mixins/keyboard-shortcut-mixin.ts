import { LitElement } from "lit";
import { Constructor } from "../types";

export const KeyboardShortcutMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _keydownEvent = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        this.handleKeyboardSave();
      }
    };

    public connectedCallback() {
      super.connectedCallback();
      this.addEventListener("keydown", this._keydownEvent);
    }

    public disconnectedCallback() {
      this.removeEventListener("keydown", this._keydownEvent);
      super.disconnectedCallback();
    }

    protected handleKeyboardSave() {}
  };
