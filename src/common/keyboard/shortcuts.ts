import { tinykeys } from "tinykeys";
import { canOverrideAlphanumericInput } from "../dom/can-override-input";

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutManager {
  /**
   * Add a group of keyboard shortcuts to the manager.
   *
   * @param shortcuts - Key combinations mapped to handler functions.
   *   Uses tinykeys syntax. See https://github.com/jamiebuilds/tinykeys#usage.
   */
  add: (shortcuts: Record<string, ShortcutHandler>) => void;

  /**
   * Remove shortcuts from the manager.
   *
   * @param keys - Optional array of specific key combinations to remove. If provided,
   *   only shortcuts matching these keys will be removed. If omitted, all shortcuts
   *   from this manager will be removed.
   */
  remove: (keys?: string[]) => void;
}

interface ShortcutEntry {
  keys: Set<string>;
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
      if (!canOverrideAlphanumericInput(event.composedPath())) {
        return;
      }
      if (window.getSelection()?.toString()) {
        return;
      }
      handler(event);
    };
  });

  // Underlying implementation (tinykeys for now)
  return tinykeys(window, wrappedShortcuts);
}

/**
 * Create a shortcut manager that can add and dispose shortcuts.
 *
 * @returns A shortcut manager containing the add and remove methods.
 */
export function createShortcutManager(): ShortcutManager {
  const shortcutEntries: ShortcutEntry[] = [];

  return {
    add(shortcuts: Record<string, ShortcutHandler>) {
      const disposer = registerShortcuts(shortcuts);
      const keys = new Set(Object.keys(shortcuts));
      const entry: ShortcutEntry = { keys, disposer };
      shortcutEntries.push(entry);
    },

    remove(keys?: string[]) {
      if (keys) {
        const entriesToRemove: ShortcutEntry[] = [];

        for (const entry of shortcutEntries) {
          if (keys.some((key) => entry.keys.has(key))) {
            entry.disposer();
            entriesToRemove.push(entry);
          }
        }

        for (const entry of entriesToRemove) {
          const index = shortcutEntries.indexOf(entry);
          if (index !== -1) {
            shortcutEntries.splice(index, 1);
          }
        }
      } else {
        shortcutEntries.forEach((entry) => entry.disposer());
        shortcutEntries.length = 0;
      }
    },
  };
}
