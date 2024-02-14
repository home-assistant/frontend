import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showDeleteSuccessToast } from "../../../util/toast-deleted-success";
import { Lovelace } from "../types";
import { showDeleteCardDialog } from "./card-editor/show-delete-card-dialog";
import { deleteCard, insertCard } from "./config-util";
import {
  LovelaceCardPath,
  findLovelaceContainer,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "./lovelace-path";

export async function confDeleteCard(
  element: HTMLElement,
  hass: HomeAssistant,
  lovelace: Lovelace,
  path: LovelaceCardPath
): Promise<void> {
  const containerPath = getLovelaceContainerPath(path);
  const { cardIndex } = parseLovelaceCardPath(path);
  const containerConfig = findLovelaceContainer(lovelace.config, containerPath);
  if ("strategy" in containerConfig) {
    throw new Error("Deleting cards in a strategy is not supported.");
  }
  const cardConfig = containerConfig.cards![cardIndex];
  showDeleteCardDialog(element, {
    cardConfig,
    deleteCard: async () => {
      try {
        const newLovelace = deleteCard(lovelace.config, path);
        await lovelace.saveConfig(newLovelace);
        const action = async () => {
          await lovelace.saveConfig(insertCard(newLovelace, path, cardConfig));
        };
        showDeleteSuccessToast(element, hass!, action);
      } catch (err: any) {
        showAlertDialog(element, {
          text: `Deleting failed: ${err.message}`,
        });
      }
    },
  });
}
