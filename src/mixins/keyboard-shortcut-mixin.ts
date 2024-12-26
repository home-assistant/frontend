import type { LitElement } from "lit";
import type { Constructor } from "../types";

declare global {
  interface SupportedShortcuts {
    [key: string]: () => void;
  }
}

export const KeyboardShortcutMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _keydownEvent = (event: KeyboardEvent) => {
      const supportedShortcuts = this.supportedShortcuts();
      if ((event.ctrlKey || event.metaKey) && event.key in supportedShortcuts) {
        event.preventDefault();
        supportedShortcuts[event.key]();
      }
    };

    public connectedCallback() {
      super.connectedCallback();
      window.addEventListener("keydown", this._keydownEvent);
    }

    public disconnectedCallback() {
      window.removeEventListener("keydown", this._keydownEvent);
      super.disconnectedCallback();
    }

    protected supportedShortcuts(): SupportedShortcuts {
      return {};
    }
  };
