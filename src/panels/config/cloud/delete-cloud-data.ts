import { fireEvent } from "../../../common/dom/fire_event";
import { cloudLogout, removeCloudData } from "../../../data/cloud";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

// Confirms, then wipes every trace of the cloud account from this instance.
// `signOutFirst` is for callers reached while signed in: the session has to go
// before the data can.
export const confirmDeleteCloudData = async (
  element: HTMLElement,
  hass: HomeAssistant,
  { signOutFirst = false }: { signOutFirst?: boolean } = {}
): Promise<boolean> => {
  const confirm = await showConfirmationDialog(element, {
    title: hass.localize(
      "ui.panel.config.cloud.account.reset_data_confirm_title"
    ),
    text: hass.localize(
      "ui.panel.config.cloud.account.reset_data_confirm_text"
    ),
    confirmText: hass.localize("ui.panel.config.cloud.account.reset"),
    destructive: true,
  });

  if (!confirm) {
    return false;
  }

  try {
    if (signOutFirst) {
      await cloudLogout(hass);
    }
    await removeCloudData(hass);
  } catch (err: any) {
    showAlertDialog(element, {
      title: hass.localize("ui.panel.config.cloud.account.reset_data_failed"),
      text: err?.message,
    });
    return false;
  } finally {
    fireEvent(element, "ha-refresh-cloud-status");
  }

  return true;
};
