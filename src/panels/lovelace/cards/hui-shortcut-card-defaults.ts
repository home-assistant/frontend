import { mdiLink, mdiMicrophone, mdiOpenInNew, mdiRoomService } from "@mdi/js";
import type { NavigationPathInfo } from "../../../data/compute-navigation-path-info";
import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { HomeAssistant } from "../../../types";

const DEFAULT: NavigationPathInfo = { label: "", iconPath: mdiLink };

export const getShortcutCardDefaults = (
  hass: HomeAssistant,
  action: ActionConfig | undefined,
  navInfo: NavigationPathInfo
): NavigationPathInfo => {
  switch (action?.action) {
    case "navigate":
      return navInfo;
    case "assist":
      return {
        label: hass.localize(
          "ui.panel.lovelace.editor.action-editor.actions.assist"
        ),
        iconPath: mdiMicrophone,
      };
    case "call-service":
    case "perform-action":
      return {
        label: action.perform_action || "",
        iconPath: mdiRoomService,
      };
    case "url":
      return {
        label: action.url_path || "",
        iconPath: mdiOpenInNew,
      };
    default:
      return DEFAULT;
  }
};
