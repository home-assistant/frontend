import { tinykeys } from "tinykeys";
import { canOverrideAlphanumericInput } from "../dom/can-override-input";

/**
 * A function to handle a keyboard shortcut.
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Configuration for a keyboard shortcut.
 */
export interface ShortcutConfig {
  handler: ShortcutHandler;
  /**
   * If true, allows shortcuts even when text is selected.
   * Default is false to avoid interrupting copy/paste.
   */
  allowWhenTextSelected?: boolean;
  allowInInput?: boolean;
}

/**
 * Register keyboard shortcuts using tinykeys.
 * Automatically blocks shortcuts in input fields and during text selection.
 */
function registerShortcuts(
  shortcuts: Record<string, ShortcutConfig>
): () => void {
  const wrappedShortcuts: Record<string, ShortcutHandler> = {};

  Object.entries(shortcuts).forEach(([key, config]) => {
    wrappedShortcuts[key] = (event: KeyboardEvent) => {
      if (
        !config.allowInInput &&
        !canOverrideAlphanumericInput(event.composedPath())
      ) {
        return;
      }
      if (!config.allowWhenTextSelected && window.getSelection()?.toString()) {
        return;
      }
      config.handler(event);
    };
  });

  return tinykeys(window, wrappedShortcuts);
}

/**
 * Manages keyboard shortcuts registration and cleanup.
 */
export class ShortcutManager {
  private _disposer?: () => void;

  /**
   * Register keyboard shortcuts.
   * Uses tinykeys syntax: https://github.com/jamiebuilds/tinykeys#usage
   */
  public add(shortcuts: Record<string, ShortcutConfig>) {
    this._disposer?.();
    this._disposer = registerShortcuts(shortcuts);
  }

  /**
   * Remove all registered shortcuts.
   */
  public remove() {
    this._disposer?.();
    this._disposer = undefined;
  }
}
