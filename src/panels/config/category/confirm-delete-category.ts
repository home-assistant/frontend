import type { HomeAssistant } from "../../../types";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";

export const confirmDeleteCategory = (
  element: HTMLElement,
  hass: HomeAssistant
) =>
  showConfirmationDialog(element, {
    title: hass.localize("ui.panel.config.category.editor.confirm_delete"),
    text: hass.localize("ui.panel.config.category.editor.confirm_delete_text"),
    confirmText: hass.localize("ui.common.delete"),
    destructive: true,
  });
