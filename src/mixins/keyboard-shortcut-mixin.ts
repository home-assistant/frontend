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
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key in supportedShortcuts
      ) {
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

    private _listenersAdded = false;

    public connectedCallback() {
      super.connectedCallback();
      this.addKeyboardShortcuts();
    }

    public disconnectedCallback() {
      this.removeKeyboardShortcuts();
      super.disconnectedCallback();
    }

    public addKeyboardShortcuts() {
      if (this._listenersAdded) {
        return;
      }
      this._listenersAdded = true;
      window.addEventListener("keydown", this._keydownEvent);
    }

    public removeKeyboardShortcuts() {
      this._listenersAdded = false;
      window.removeEventListener("keydown", this._keydownEvent);
    }

    protected supportedShortcuts(): SupportedShortcuts {
      return {};
    }

    protected supportedSingleKeyShortcuts(): SupportedShortcuts {
      return {};
    }
  };
