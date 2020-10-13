import { LitElement } from "lit-element";
import { Constructor } from "../types";

type RegisteredShortcuts = {
  [key in HAKeyboardShortcut]?: () => void;
};

export enum HAKeyboardShortcut {
  CTRL_S = "CtrlS",
  CTRL_P = "CtrlP",
  CTRL_SHIFT_P = "CtrlShiftP",
}

const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

export const KeyboardShortcutMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _registeredShortcuts: RegisteredShortcuts = {};

    public disconnectedCallback() {
      this.removeEventListener("keydown", this._keydownEvent);
      super.disconnectedCallback();
    }

    private _executeShortcut(
      event: KeyboardEvent,
      shortcut: HAKeyboardShortcut
    ) {
      if (Object.keys(this._registeredShortcuts).includes(shortcut)) {
        event.preventDefault();
        const shortcutAction = this._registeredShortcuts[shortcut];
        if (shortcutAction) {
          shortcutAction();
        }
      }
    }

    protected registerShortcut(
      shortcut: HAKeyboardShortcut,
      callback: () => void,
      element: HTMLElement | Document = this
    ) {
      element.addEventListener("keydown", (event) => this._keydownEvent(event));
      this._registeredShortcuts[shortcut] = callback;
    }

    private _keydownEvent = (event: KeyboardEvent) => {
      if (this.isOSCtrlKey(event)) {
        switch (event.code) {
          case "KeyS":
            this._executeShortcut(event, HAKeyboardShortcut.CTRL_S);
            break;
          case "KeyP":
            if (event.shiftKey) {
              this._executeShortcut(event, HAKeyboardShortcut.CTRL_SHIFT_P);
            } else {
              this._executeShortcut(event, HAKeyboardShortcut.CTRL_P);
            }
            break;
        }
      }
    };

    private isOSCtrlKey(e: KeyboardEvent) {
      return isMac ? e.metaKey : e.ctrlKey;
    }
  };
