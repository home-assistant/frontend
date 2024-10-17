import { ensureBadgeConfig } from "../../../data/lovelace/config/badge";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { showDeleteSuccessToast } from "../../../util/toast-deleted-success";
import { Lovelace } from "../types";
import { showDeleteBadgeDialog } from "./badge-editor/show-delete-badge-dialog";
import { deleteBadge, insertBadge } from "./config-util";
import {
  LovelaceCardPath,
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "./lovelace-path";

export async function confDeleteBadge(
  element: HTMLElement,
  hass: HomeAssistant,
  lovelace: Lovelace,
  path: LovelaceCardPath
): Promise<void> {
  const { cardIndex: badgeIndex } = parseLovelaceCardPath(path);
  const containerPath = getLovelaceContainerPath(path);

  const badges = findLovelaceItems("badges", lovelace.config, containerPath);

  const badgeConfig = ensureBadgeConfig(badges![badgeIndex]);

  showDeleteBadgeDialog(element, {
    badgeConfig,
    deleteBadge: async () => {
      try {
        const newLovelace = deleteBadge(lovelace.config, path);
        await lovelace.saveConfig(newLovelace);
        const action = async () => {
          await lovelace.saveConfig(
            insertBadge(newLovelace, path, badgeConfig)
          );
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
