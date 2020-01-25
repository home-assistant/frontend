import { Lovelace } from "../types";
import { deleteCard } from "./config-util";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
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
        showAlertDialog(element, {
          text: `Deleting failed: ${err.message}`,
        });
      }
    },
  });
}
