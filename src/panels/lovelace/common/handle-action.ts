import { sanitizeUrl } from "@braintree/sanitize-url";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { forwardHaptic } from "../../../data/haptics";
import { domainToName } from "../../../data/integration";
import type {
  ActionConfig,
  ConfirmationRestrictionConfig,
} from "../../../data/lovelace/config/action";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { showVoiceCommandDialog } from "../../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import type { HomeAssistant } from "../../../types";
import { showToast } from "../../../util/toast";
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

export const getActionConfig = (
  config: ActionConfigParams,
  action: string
): ActionConfig => {
  if (action === "double_tap" && config.double_tap_action) {
    return config.double_tap_action;
  }
  if (action === "hold" && config.hold_action) {
    return config.hold_action;
  }
  if (action === "tap" && config.tap_action) {
    return config.tap_action;
  }
  return { action: "more-info" };
};

const showActionConfirmation = async (
  node: HTMLElement,
  hass: HomeAssistant,
  actionConfig: ActionConfig,
  confirmation: ConfirmationRestrictionConfig
): Promise<boolean> => {
  forwardHaptic(node, "warning");

  let serviceName;
  if (
    actionConfig.action === "call-service" ||
    actionConfig.action === "perform-action"
  ) {
    const [domain, service] = (actionConfig.perform_action ||
      actionConfig.service)!.split(".", 2);
    const serviceDomains = hass.services;
    if (domain in serviceDomains && service in serviceDomains[domain]) {
      await hass.loadBackendTranslation("title");
      const localize = await hass.loadBackendTranslation("services");
      serviceName = `${domainToName(localize, domain)}: ${
        localize(
          `component.${domain}.services.${service}.name`,
          hass.services[domain][service].description_placeholders
        ) ||
        serviceDomains[domain][service].name ||
        service
      }`;
    }
  }

  return showConfirmationDialog(node, {
    text:
      confirmation.text ||
      hass.localize("ui.panel.lovelace.cards.actions.action_confirmation", {
        action:
          serviceName ||
          hass.localize(
            `ui.panel.lovelace.editor.action-editor.actions.${actionConfig.action}`
          ) ||
          actionConfig.action,
      }),
    title: confirmation.title,
    dismissText: confirmation.dismiss_text,
    confirmText: confirmation.confirm_text,
  });
};

/**
 * Asks the user to confirm an action when it is configured to, and resolves to
 * whether it may go ahead. Returns undefined when nothing has to be confirmed,
 * so callers can run the action without awaiting.
 */
export const confirmActionConfig = (
  node: HTMLElement,
  hass: HomeAssistant,
  actionConfig: ActionConfig
): Promise<boolean> | undefined => {
  const confirmation = actionConfig.confirmation;
  if (
    !confirmation ||
    confirmation.exemptions?.some((e) => e.user === hass!.user?.id)
  ) {
    return undefined;
  }
  return showActionConfirmation(node, hass, actionConfig, confirmation);
};

/**
 * Performs the service call of an action, and returns its promise so callers
 * can show the outcome. Returns undefined when the action calls no service.
 */
export const performActionCall = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: ActionConfigParams,
  actionConfig: ActionConfig
): Promise<unknown> | undefined => {
  switch (actionConfig.action) {
    case "toggle": {
      if (!config.entity) {
        showToast(node, {
          message: hass.localize(
            "ui.panel.lovelace.cards.actions.no_entity_toggle"
          ),
        });
        forwardHaptic(node, "failure");
        return undefined;
      }
      forwardHaptic(node, "light");
      return toggleEntity(hass, config.entity);
    }
    case "perform-action":
    case "call-service": {
      if (!actionConfig.perform_action && !actionConfig.service) {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_action"),
        });
        forwardHaptic(node, "failure");
        return undefined;
      }
      const [domain, service] = (actionConfig.perform_action ||
        actionConfig.service)!.split(".", 2);
      forwardHaptic(node, "light");
      return hass.callService(
        domain,
        service,
        actionConfig.data ?? actionConfig.service_data,
        actionConfig.target
      );
    }
    default:
      return undefined;
  }
};

export const handleAction = async (
  node: HTMLElement,
  hass: HomeAssistant,
  config: ActionConfigParams,
  action: string
): Promise<void> => {
  const actionConfig = getActionConfig(config, action);

  const confirmation = confirmActionConfig(node, hass, actionConfig);
  if (confirmation && !(await confirmation)) {
    return;
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
        window.open(sanitizeUrl(actionConfig.url_path));
      } else {
        showToast(node, {
          message: hass.localize("ui.panel.lovelace.cards.actions.no_url"),
        });
        forwardHaptic(node, "failure");
      }
      break;
    }
    case "toggle":
    case "perform-action":
    case "call-service": {
      performActionCall(node, hass, config, actionConfig);
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
