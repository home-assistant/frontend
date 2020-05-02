import type { LitElement } from "lit-element";
import {
  HassioAddonDetails,
  restartHassioAddon,
} from "../../../src/data/hassio/addon";
import { HomeAssistant } from "../../../src/types";
import {
  showConfirmationDialog,
  showAlertDialog,
} from "../../../src/dialogs/generic/show-dialog-box";

export const suggestAddonRestart = async (
  element: LitElement,
  hass: HomeAssistant,
  addon: HassioAddonDetails
): Promise<void> => {
  const confirmed = await showConfirmationDialog(element, {
    title: addon.name,
    text: "Do you want to restart the add-on with your changes?",
    confirmText: "restart add-on",
    dismissText: "no",
  });
  if (confirmed) {
    try {
      await restartHassioAddon(hass, addon.slug);
    } catch (err) {
      showAlertDialog(element, {
        title: "Failed to restart",
        text: err.body.message,
      });
    }
  }
};
