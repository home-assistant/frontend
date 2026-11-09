import type { LitElement } from "lit";
import type { Constructor } from "../types";
import { canOverrideAlphanumericInput } from "../common/dom/can-override-input";
import { deepActiveElement } from "../common/dom/deep-active-element";
import { nextRender } from "../common/util/render-status";
import { getTopOpenDialogTag } from "../dialogs/make-dialog-manager";

declare global {
  type SupportedShortcuts = Record<string, () => void>;
}

export const normalizeShortcutKey = (event: KeyboardEvent): string => {
  const { key } = event;
  if (key.length !== 1) {
    return key;
  }
  return event.shiftKey ? key.toUpperCase() : key.toLowerCase();
};

const isModalBoundary = (el: EventTarget): boolean =>
  el instanceof HTMLElement &&
  (el.localName === "dialog" ||
    el.localName.endsWith("-dialog") ||
    el.getAttribute("role") === "dialog" ||
    el.getAttribute("aria-modal") === "true");

export const KeyboardShortcutMixin = <T extends Constructor<LitElement>>(
  superClass: T
) =>
  class extends superClass {
    private _keydownEvent = (event: KeyboardEvent) => {
      const supportedShortcuts = this.supportedShortcuts();
      const key =
        event.shiftKey && event.key.length > 1
          ? event.key.toUpperCase()
          : normalizeShortcutKey(event);
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        key in supportedShortcuts
      ) {
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

    // Only the topmost dialog may handle the shortcut, even when focus has
    // fallen back to the page behind it
    private _isTopDialogOrPage(): boolean {
      const topDialogTag = getTopOpenDialogTag();
      return !topDialogTag || topDialogTag === this.localName;
    }

    private _isEventInScope(event: KeyboardEvent): boolean {
      if (!this._isTopDialogOrPage()) {
        return false;
      }

      const path = event.composedPath();
      const hostIndex = path.indexOf(this);

      if (hostIndex === -1) {
        return !path.some(isModalBoundary);
      }

      // The editor's own dialog wrapper is the top-level element of its
      // template, i.e. the one right below its render root
      const rootIndex = path.indexOf(this.renderRoot);
      const wrapper =
        rootIndex > 0 && path[rootIndex - 1] instanceof HTMLElement
          ? (path[rootIndex - 1] as HTMLElement)
          : undefined;

      // Any other modal between the target and this editor is nested (for
      // example a picker) and keeps the shortcut to itself
      return !path.slice(0, hostIndex).some((el) => {
        if (!isModalBoundary(el)) {
          return false;
        }
        if (!wrapper) {
          return true;
        }
        const root = (el as HTMLElement).getRootNode();
        return !(
          el === wrapper ||
          root === wrapper.shadowRoot ||
          (root instanceof ShadowRoot &&
            root.host.localName === "wa-dialog" &&
            root.host.getRootNode() === wrapper.shadowRoot)
        );
      });
    }

    // Runs in the capture phase so inputs and code editors can't consume the
    // shortcut before it reaches the window
    private _keydownCaptureEvent = async (event: KeyboardEvent) => {
      const supportedShortcuts = this.supportedShortcutsInInput();
      const key = normalizeShortcutKey(event);
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        !(key in supportedShortcuts) ||
        !this._isEventInScope(event)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      // Fields that only publish their value on `change` would lose pending
      // edits, so blur to commit them and let the update propagate first
      const activeElement = deepActiveElement();
      if (
        activeElement instanceof HTMLElement &&
        activeElement !== document.body
      ) {
        activeElement.blur();
        await nextRender();
        // The editor may have been removed, or a dialog opened, in the meantime
        if (!this._listenersAdded || !this._isTopDialogOrPage()) {
          return;
        }
      }
      this.supportedShortcutsInInput()[key]?.();
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

    /**
     * Shortcuts that also work while an input or code editor is focused.
     */
    protected supportedShortcutsInInput(): SupportedShortcuts {
      return {};
    }

    protected supportedSingleKeyShortcuts(): SupportedShortcuts {
      return {};
    }
  };
