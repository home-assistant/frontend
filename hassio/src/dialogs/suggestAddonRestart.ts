import type { LitElement } from "lit";
import {
  HassioAddonDetails,
  restartHassioAddon,
} from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../src/types";

export const suggestAddonRestart = async (
  element: LitElement,
  hass: HomeAssistant,
  supervisor: Supervisor,
  addon: HassioAddonDetails
): Promise<void> => {
  const confirmed = await showConfirmationDialog(element, {
    title: supervisor.localize("dialog.restart_addon.title", {
      name: addon.name,
    }),
    text: supervisor.localize("dialog.restart_addon.text"),
    confirmText: supervisor.localize("dialog.restart_addon.restart"),
    dismissText: supervisor.localize("common.cancel"),
  });
  if (confirmed) {
    try {
      await restartHassioAddon(hass, addon.slug);
    } catch (err: any) {
      showAlertDialog(element, {
        title: supervisor.localize("common.failed_to_restart_name", {
          name: addon.name,
        }),
        text: extractApiErrorMessage(err),
      });
    }
  }
};
