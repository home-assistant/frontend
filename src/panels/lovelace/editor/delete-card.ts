import type { HomeAssistant } from "../../../types";
import type { Lovelace } from "../types";
import type { LovelacePath } from "./lovelace-path";
import { deleteAtPath } from "./lovelace-path";
import { fireEvent } from "../../../common/dom/fire_event";
import { LOVELACE_EDIT_TOAST_ID } from "./edit-toast";

export interface DeleteCardParams {
  path: LovelacePath;
  silent: boolean;
}

export async function performDeleteCard(
  hass: HomeAssistant,
  lovelace: Lovelace,
  params: DeleteCardParams
): Promise<boolean> {
  try {
    const { path, silent } = params;
    const oldConfig = lovelace.config;
    const newConfig = deleteAtPath(oldConfig, path);
    await lovelace.saveConfig(newConfig);

    if (silent) {
      return true;
    }

    lovelace.showToast({
      id: LOVELACE_EDIT_TOAST_ID,
      message: hass.localize("ui.common.successfully_deleted"),
      duration: 8000,
      action: {
        action: () => fireEvent(window, "undo-change"),
        text: hass.localize("ui.common.undo"),
      },
    });
    return true;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    lovelace.showToast({
      id: LOVELACE_EDIT_TOAST_ID,
      message: hass.localize("ui.common.deleting_failed"),
    });
    return false;
  }
}
