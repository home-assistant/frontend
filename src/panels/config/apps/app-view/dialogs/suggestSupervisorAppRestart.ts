import type { LitElement } from "lit";
import type { HassioAddonDetails } from "../../../../../data/hassio/addon";
import { restartHassioAddon } from "../../../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../../../data/hassio/common";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../types";

export const suggestSupervisorAppRestart = async (
  element: LitElement,
  hass: HomeAssistant,
  addon: HassioAddonDetails
): Promise<void> => {
  const confirmed = await showConfirmationDialog(element, {
    title: hass.localize(
      "ui.panel.config.apps.dashboard.restart_dialog.title",
      {
        name: addon.name,
      }
    ),
    text: hass.localize("ui.panel.config.apps.dashboard.restart_dialog.text"),
    confirmText: hass.localize(
      "ui.panel.config.apps.dashboard.restart_dialog.restart"
    ),
    dismissText: hass.localize("ui.common.cancel"),
  });
  if (confirmed) {
    try {
      await restartHassioAddon(hass, addon.slug);
    } catch (err: any) {
      showAlertDialog(element, {
        title: hass.localize(
          "ui.panel.config.apps.dashboard.failed_to_restart",
          {
            name: addon.name,
          }
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }
};
