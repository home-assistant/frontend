import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../types";
import { Lovelace } from "../types";
import { deleteBadge } from "./config-util";
import { LovelaceCardPath } from "./lovelace-path";

export async function deleteBadgeWithUndo(
  element: HTMLElement,
  hass: HomeAssistant,
  lovelace: Lovelace,
  path: LovelaceCardPath
): Promise<void> {
  try {
    const oldConfig = lovelace.config;
    const newConfig = deleteBadge(oldConfig, path);
    const action = async () => {
      lovelace.saveConfig(oldConfig);
    };
    await lovelace.saveConfig(newConfig);
    lovelace.showToast({
      message: hass.localize("ui.common.successfully_deleted"),
      duration: 8000,
      action: { action, text: hass.localize("ui.common.undo") },
    });
  } catch (err: any) {
    showAlertDialog(element, {
      text: `Deleting failed: ${err.message}`,
    });
  }
}
