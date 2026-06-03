import { domainToName } from "../../../data/integration";
import type { ActionConfig } from "../../../data/lovelace/config/action";
import type { HomeAssistant } from "../../../types";

export const getConfirmationDefaultText = async (
  hass: HomeAssistant,
  actionConfig: Pick<ActionConfig, "action"> & {
    perform_action?: string;
    service?: string;
  }
): Promise<string> => {
  let actionLabel: string | undefined;

  if (
    actionConfig.action === "call-service" ||
    actionConfig.action === "perform-action"
  ) {
    const performAction = actionConfig.perform_action || actionConfig.service;
    if (performAction) {
      const [domain, service] = performAction.split(".", 2);
      const serviceDomains = hass.services;
      if (domain in serviceDomains && service in serviceDomains[domain]) {
        await hass.loadBackendTranslation("title");
        const localize = await hass.loadBackendTranslation("services");
        actionLabel = `${domainToName(localize, domain)}: ${
          localize(
            `component.${domain}.services.${service}.name`,
            hass.services[domain][service].description_placeholders
          ) ||
          serviceDomains[domain][service].name ||
          service
        }`;
      }
    }
  }

  return hass.localize("ui.panel.lovelace.cards.actions.action_confirmation", {
    action:
      actionLabel ||
      hass.localize(
        `ui.panel.lovelace.editor.action-editor.actions.${actionConfig.action}` as any
      ) ||
      actionConfig.action,
  });
};
