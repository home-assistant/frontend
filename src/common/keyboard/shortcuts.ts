import { tinykeys } from "tinykeys";
import { canOverrideAlphanumericInput } from "../dom/can-override-input";
import type { HomeAssistant } from "../../types";

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutManager {
  add: (shortcuts: Record<string, ShortcutHandler>) => () => void;
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

  for (const [key, handler] of Object.entries(shortcuts)) {
    wrappedShortcuts[key] = (event: KeyboardEvent) => {
      if (!canOverrideAlphanumericInput(event.composedPath())) {
        return;
      }
      if (window.getSelection()?.toString()) {
        return;
      }
      handler(event);
    };
  }

  // Underlying implementation (tinykeys for now)
  return tinykeys(window, wrappedShortcuts);
}

/**
 * Create a shortcut manager that can add and dispose shortcuts.
 *
 * @param hass - Home Assistant context to check if shortcuts are enabled.
 * @returns A shortcut manager containing the add and remove methods.
 */
export function createShortcutManager(hass?: HomeAssistant): ShortcutManager {
  const shortcutEntries: ShortcutEntry[] = [];

  return {
    add(shortcuts: Record<string, ShortcutHandler>) {
      // Skip registration if shortcuts are disabled
      if (hass && !hass.enableShortcuts) {
        return () => {
          // No-op disposer
        };
      }

      const disposer = registerShortcuts(shortcuts);
      const keys = new Set(Object.keys(shortcuts));
      const entry: ShortcutEntry = { keys, disposer };
      shortcutEntries.push(entry);

      return () => {
        // Remove this entry from the list and call its disposer
        const index = shortcutEntries.indexOf(entry);
        if (index !== -1) {
          shortcutEntries.splice(index, 1);
          disposer();
        }
      };
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
