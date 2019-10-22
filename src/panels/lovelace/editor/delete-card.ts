import { Lovelace } from "../types";
import { deleteCard } from "./config-util";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";
import { HomeAssistant } from "../../../types";

export async function confDeleteCard(
  element: HTMLElement,
  hass: HomeAssistant,
  lovelace: Lovelace,
  path: [number, number]
): Promise<void> {
  showConfirmationDialog(element, {
    text: hass.localize("ui.panel.lovelace.cards.confirm_delete"),
    confirm: async () => {
      try {
        await lovelace.saveConfig(deleteCard(lovelace.config, path));
      } catch (err) {
        alert(`Deleting failed: ${err.message}`);
      }
    },
  });
}
