import { tinykeys } from "tinykeys";
import { canOverrideAlphanumericInput } from "../dom/can-override-input";

export type ShortcutHandler = (event: KeyboardEvent) => void;

interface ShortcutEntry {
  /**
   * The keys that the shortcut is registered to.
   */
  keys: Set<string>;
  /**
   * A function to remove the shortcuts.
   */
  disposer: () => void;
}

/**
 * Register keyboard shortcuts using tinykeys.
 *
 * @param shortcuts - Key combinations mapped to handler functions.
 * @returns A function to remove the shortcuts.
 */
function registerShortcuts(
  shortcuts: Record<string, ShortcutHandler>
): () => void {
  const wrappedShortcuts: Record<string, ShortcutHandler> = {};

  Object.entries(shortcuts).forEach(([key, handler]) => {
    wrappedShortcuts[key] = (event: KeyboardEvent) => {
      // Don't capture the event if the user is focused on an input field
      if (!canOverrideAlphanumericInput(event.composedPath())) {
        return;
      }
      // Don't capture the event if the user is selecting text
      if (window.getSelection()?.toString()) {
        return;
      }
      handler(event);
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
   * @param shortcuts - Key combinations mapped to handler functions.
   *   Uses tinykeys syntax. See https://github.com/jamiebuilds/tinykeys#usage.
   */
  public add(shortcuts: Record<string, ShortcutHandler>) {
    const disposer = registerShortcuts(shortcuts);
    const keys = new Set(Object.keys(shortcuts));
    const entry: ShortcutEntry = { keys, disposer };
    this.shortcutEntries.push(entry);
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
        if (keys.some((key) => entry.keys.has(key))) {
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
