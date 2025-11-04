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
  /**
   * The handler function to call when the shortcut is triggered.
   */
  handler: ShortcutHandler;
  /**
   * If true, the shortcut will be triggered even when the user is selecting text.
   * By default (false), shortcuts are blocked during text selection to avoid
   * interrupting copy/paste operations.
   */
  allowWhenTextSelected?: boolean;
}

interface ShortcutEntry {
  /**
   * The key that the shortcut is registered to.
   */
  key: string;
  /**
   * A function to remove the shortcut.
   */
  disposer: () => void;
}

/**
 * Register keyboard shortcuts using tinykeys.
 *
 * @param shortcuts - Key combinations mapped to shortcut configurations.
 * @returns A function to remove the shortcuts.
 */
function registerShortcuts(
  shortcuts: Record<string, ShortcutConfig>
): () => void {
  const wrappedShortcuts: Record<string, ShortcutHandler> = {};

  Object.entries(shortcuts).forEach(([key, config]) => {
    wrappedShortcuts[key] = (event: KeyboardEvent) => {
      // Don't capture the event if the user is focused on an input field
      if (!canOverrideAlphanumericInput(event.composedPath())) {
        return;
      }
      // Don't capture the event if the user is selecting text to avoid
      // interrupting copy/paste operations or text manipulation
      if (!config.allowWhenTextSelected && window.getSelection()?.toString()) {
        return;
      }
      config.handler(event);
    };
  });

  return tinykeys(window, wrappedShortcuts);
}

/**
 * A class that can add and remove keyboard shortcuts.
 */
export class ShortcutManager {
  public shortcutEntries: ShortcutEntry[] = [];

  /**
   * Add a group of keyboard shortcuts to the manager.
   *
   * @param shortcuts - Key combinations mapped to shortcut configurations.
   *   Uses tinykeys syntax. See https://github.com/jamiebuilds/tinykeys#usage.
   */
  public add(shortcuts: Record<string, ShortcutConfig>) {
    Object.entries(shortcuts).forEach(([key, config]) => {
      const disposer = registerShortcuts({ [key]: config });
      const entry: ShortcutEntry = { key, disposer };
      this.shortcutEntries.push(entry);
    });
  }

  /**
   * Remove shortcuts from the manager.
   *
   * @param keys - Optional array of specific key combinations to remove. If provided,
   *   only shortcuts matching these keys will be removed. If omitted, all shortcuts
   *   from this manager will be removed.
   */
  public remove(keys?: string[]) {
    if (keys) {
      const entriesToRemove: ShortcutEntry[] = [];

      for (const entry of this.shortcutEntries) {
        if (keys.includes(entry.key)) {
          entry.disposer();
          entriesToRemove.push(entry);
        }
      }

      entriesToRemove.forEach((entry) => {
        const index = this.shortcutEntries.indexOf(entry);
        if (index !== -1) {
          this.shortcutEntries.splice(index, 1);
        }
      });
    } else {
      this.shortcutEntries.forEach((entry) => entry.disposer());
      this.shortcutEntries.length = 0;
    }
  }
}
