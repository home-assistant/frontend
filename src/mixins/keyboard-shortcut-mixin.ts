import type { LitElement } from "lit";
import type { Constructor } from "../types";

declare global {
  type SupportedShortcuts = Record<string, () => void>;
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
        return;
      }

      const supportedSingleKeyShortcuts = this.supportedSingleKeyShortcuts();
      if (event.key in supportedSingleKeyShortcuts) {
        event.preventDefault();
        supportedSingleKeyShortcuts[event.key]();
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

    protected supportedSingleKeyShortcuts(): SupportedShortcuts {
      return {};
    }
  };
