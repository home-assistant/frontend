import type { LitElement } from "lit";
import type { Constructor } from "../types";
import { canOverrideAlphanumericInput } from "../common/dom/can-override-input";

declare global {
  type SupportedShortcuts = Record<string, () => void>;
}

export const KeyboardShortcutMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _keydownEvent = (event: KeyboardEvent) => {
      const supportedShortcuts = this.supportedShortcuts();
      const key = event.shiftKey ? event.key.toUpperCase() : event.key;
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        key in supportedShortcuts
      ) {
        if (this.supportedShortcutsInInput().includes(key)) {
          return;
        }
        // Only capture the event if the user is not focused on an input
        if (!canOverrideAlphanumericInput(event.composedPath())) {
          return;
        }
        // Don't capture the event if the user is selecting text
        if (window.getSelection()?.toString()) {
          return;
        }
        event.preventDefault();
        supportedShortcuts[key]();
        return;
      }

      const supportedSingleKeyShortcuts = this.supportedSingleKeyShortcuts();
      if (key in supportedSingleKeyShortcuts) {
        event.preventDefault();
        supportedSingleKeyShortcuts[key]();
      }
    };

    private _keydownCaptureEvent = (event: KeyboardEvent) => {
      const supportedShortcuts = this.supportedShortcuts();
      const key = event.shiftKey ? event.key.toUpperCase() : event.key;
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        key in supportedShortcuts &&
        this.supportedShortcutsInInput().includes(key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        supportedShortcuts[key]();
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
      window.addEventListener("keydown", this._keydownCaptureEvent, true);
    }

    public removeKeyboardShortcuts() {
      this._listenersAdded = false;
      window.removeEventListener("keydown", this._keydownEvent);
      window.removeEventListener("keydown", this._keydownCaptureEvent, true);
    }

    protected supportedShortcuts(): SupportedShortcuts {
      return {};
    }

    protected supportedShortcutsInInput(): string[] {
      return [];
    }

    protected supportedSingleKeyShortcuts(): SupportedShortcuts {
      return {};
    }
  };
