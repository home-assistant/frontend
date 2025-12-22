import type { HomeAssistant } from "../../../types";
import type { Lovelace } from "../types";
import { deleteBadge } from "./config-util";
import type { LovelaceCardPath } from "./lovelace-path";
import { fireEvent } from "../../../common/dom/fire_event";

export interface DeleteBadgeParams {
  path: LovelaceCardPath;
  silent: boolean;
}

export async function performDeleteBadge(
  hass: HomeAssistant,
  lovelace: Lovelace,
  params: DeleteBadgeParams
): Promise<void> {
  try {
    const { path, silent } = params;
    const oldConfig = lovelace.config;
    const newConfig = deleteBadge(oldConfig, path);
    await lovelace.saveConfig(newConfig);

    if (silent) {
      return;
    }

    lovelace.showToast({
      message: hass.localize("ui.common.successfully_deleted"),
      duration: 8000,
      action: {
        action: () => fireEvent(window, "undo-change"),
        text: hass.localize("ui.common.undo"),
      },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    lovelace.showToast({
      message: hass.localize("ui.common.deleting_failed"),
    });
  }
}
