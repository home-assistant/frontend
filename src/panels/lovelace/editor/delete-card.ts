import type { HomeAssistant } from "../../../types";
import type { Lovelace } from "../types";
import { deleteCard } from "./config-util";
import type { LovelaceCardPath } from "./lovelace-path";

export type DeleteCardParams = { path: LovelaceCardPath; silent: boolean };

export async function performDeleteCard(
  hass: HomeAssistant,
  lovelace: Lovelace,
  params: DeleteCardParams
): Promise<void> {
  try {
    const { path, silent } = params;
    const oldConfig = lovelace.config;
    const newConfig = deleteCard(oldConfig, path);
    await lovelace.saveConfig(newConfig);

    if (silent) {
      return;
    }

    const action = async () => {
      lovelace.saveConfig(oldConfig);
    };

    lovelace.showToast({
      message: hass.localize("ui.common.successfully_deleted"),
      duration: 8000,
      action: { action, text: hass.localize("ui.common.undo") },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    lovelace.showToast({
      message: hass.localize("ui.common.deleting_failed"),
    });
  }
}
