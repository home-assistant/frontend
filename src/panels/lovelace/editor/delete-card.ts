import { Lovelace } from "../types";
import { deleteCard } from "./config-util";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showDeleteCardDialog } from "./card-editor/show-delete-card-dialog";
import { showDeleteSuccessToast } from "../../../util/toast-deleted-success";

export async function confDeleteCard(
  element: HTMLElement,
  hass: HomeAssistant,
  lovelace: Lovelace,
  path: [number, number]
): Promise<void> {
  const cardConfig = lovelace.config.views[path[0]].cards![path[1]];
  showDeleteCardDialog(element, {
    lovelaceConfig: lovelace!.config,
    cardConfig,
    path,
    deleteCard: async (config, cardPath) => {
      try {
        await lovelace.saveConfig(deleteCard(config, cardPath));
        showDeleteSuccessToast(element, hass!);
      } catch (err) {
        showAlertDialog(element, {
          text: `Deleting failed: ${err.message}`,
        });
      }
    },
  });
}
