import { tinykeys } from "tinykeys";
import { canOverrideAlphanumericInput } from "../dom/can-override-input";
import type { HomeAssistant } from "../../types";

export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Register keyboard shortcuts using tinykeys.
 *
 * @param shortcuts - Key combinations mapped to handler functions.
 * @returns A function to unregister the shortcuts.
 */
export function registerShortcuts(
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
 * @returns A shortcut manager containing the add and dispose methods.
 */
export function createShortcutManager(hass?: HomeAssistant): {
  add: (shortcuts: Record<string, ShortcutHandler>) => () => void;
  dispose: () => void;
} {
  const disposers: (() => void)[] = [];

  return {
    add(shortcuts: Record<string, ShortcutHandler>) {
      // Skip registration if shortcuts are disabled
      if (hass && !hass.enableShortcuts) {
        return () => {
          // No-op disposer
        };
      }

      const disposer = registerShortcuts(shortcuts);
      disposers.push(disposer);
      return disposer;
    },

    dispose() {
      disposers.forEach((dispose) => dispose());
      disposers.length = 0;
    },
  };
}
