import type { LocalizeFunc } from "../../../common/translations/localize";
import type { Lovelace } from "../types";
import { LOVELACE_EDIT_TOAST_ID } from "../types";
import type { LovelacePath } from "./lovelace-path";
import { deleteAtPath } from "./lovelace-path";
import { fireEvent } from "../../../common/dom/fire_event";

export interface DeleteCardParams {
  path: LovelacePath;
  silent: boolean;
}

export async function performDeleteCard(
  localize: LocalizeFunc,
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
      message: localize("ui.common.successfully_deleted"),
      duration: 8000,
      action: {
        action: () => fireEvent(window, "undo-change"),
        text: localize("ui.common.undo"),
      },
    });
    return true;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    lovelace.showToast({
      id: LOVELACE_EDIT_TOAST_ID,
      message: localize("ui.common.deleting_failed"),
    });
    return false;
  }
}
