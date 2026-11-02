import type { HassioAddonsInfo } from "../../../../data/hassio/addon";
import {
  fetchHassioAddonsInfo,
  reloadHassioAddons,
} from "../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../data/hassio/common";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../types";
import { showToast } from "../../../../util/toast";

const CHECK_UPDATES_TOAST_ID = "check-app-updates";

export const checkForAppUpdates = async (
  element: HTMLElement,
  hass: HomeAssistant
): Promise<HassioAddonsInfo | undefined> => {
  showToast(element, {
    id: CHECK_UPDATES_TOAST_ID,
    message: hass.localize("ui.panel.config.apps.store.checking_updates"),
  });

  let info: HassioAddonsInfo;
  try {
    await reloadHassioAddons(hass);
    info = await fetchHassioAddonsInfo(hass);
  } catch (err) {
    showToast(element, {
      id: CHECK_UPDATES_TOAST_ID,
      message: "",
      duration: 0,
    });
    showAlertDialog(element, {
      text: extractApiErrorMessage(err),
    });
    return undefined;
  }

  const count = info.addons.filter((addon) => addon.update_available).length;
  showToast(element, {
    id: CHECK_UPDATES_TOAST_ID,
    message: count
      ? hass.localize("ui.panel.config.apps.store.updates_available", {
          count,
        })
      : hass.localize("ui.panel.config.apps.store.no_updates"),
  });
  return info;
};
