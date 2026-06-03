import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { forwardHaptic } from "../../../data/haptics";
import type { ActionConfig } from "../../../data/lovelace/config/action";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showVoiceCommandDialog } from "../../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
import { getConfirmationDefaultText } from "./confirmation-default-text";
import { toggleEntity } from "./entity/toggle-entity";

declare global {
  interface HASSDomEvents {
    "ll-custom": ActionConfig;
  }
}

export interface ActionConfigParams {
  entity?: string;
  camera_image?: string;
  image_entity?: string;
  hold_action?: ActionConfig;
  tap_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export const handleAction = async (
  node: HTMLElement,
  hass: HomeAssistant,
  config: ActionConfigParams,
  action: string
): Promise<void> => {
  let actionConfig: ActionConfig | undefined;

  if (action === "double_tap" && config.double_tap_action) {
    actionConfig = config.double_tap_action;
  } else if (action === "hold" && config.hold_action) {
    actionConfig = config.hold_action;
  } else if (action === "tap" && config.tap_action) {
    actionConfig = config.tap_action;
  }

  if (!actionConfig) {
    actionConfig = {
      action: "more-info",
    };
  }

  if (
    actionConfig.confirmation &&
    (!actionConfig.confirmation.exemptions ||
      !actionConfig.confirmation.exemptions.some(
        (e) => e.user === hass!.user?.id
      ))
  ) {
    forwardHaptic(node, "warning");

    if (
      !(await showConfirmationDialog(node, {
        text:
          actionConfig.confirmation.text ||
          (await getConfirmationDefaultText(hass, actionConfig)),
        title: actionConfig.confirmation.title,
        dismissText: actionConfig.confirmation.dismiss_text,
        confirmText: actionConfig.confirmation.confirm_text,
      }))
    ) {
      return;
    }
  }

  switch (actionConfig.action) {
    case "more-info": {
      const entityId =
        actionConfig.entity ||
        config.entity ||
        config.camera_image ||
        config.image_entity;
      if (entityId) {
        fireEvent(node, "hass-more-info", { entityId });
      } else {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_entity_more_info"
          ),
        });
        forwardHaptic(node, "failure");
      }
      break;
    }
    case "navigate":
      if (actionConfig.navigation_path) {
        navigate(actionConfig.navigation_path, {
          replace: actionConfig.navigation_replace,
        });
      } else {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_navigation_path"
          ),
        });
        forwardHaptic(node, "failure");
      }
      break;
    case "url": {
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path);
      } else {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_url"),
        });
        forwardHaptic(node, "failure");
      }
      break;
    }
    case "toggle": {
      if (config.entity) {
        toggleEntity(hass, config.entity!);
        forwardHaptic(node, "light");
      } else {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_entity_toggle"
          ),
        });
        forwardHaptic(node, "failure");
      }
      break;
    }
    case "perform-action":
    case "call-service": {
      if (!actionConfig.perform_action && !actionConfig.service) {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_action"),
        });
        forwardHaptic(node, "failure");
        return;
      }
      const [domain, service] = (actionConfig.perform_action ||
        actionConfig.service)!.split(".", 2);
      hass.callService(
        domain,
        service,
        actionConfig.data ?? actionConfig.service_data,
        actionConfig.target
      );
      forwardHaptic(node, "light");
      break;
    }
    case "assist": {
      showVoiceCommandDialog(node, hass, {
        start_listening: actionConfig.start_listening ?? false,
        pipeline_id: actionConfig.pipeline_id ?? "last_used",
      });
      break;
    }
    case "fire-dom-event": {
      fireEvent(node, "ll-custom", actionConfig);
    }
  }
};
