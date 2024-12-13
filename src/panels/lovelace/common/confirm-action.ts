import type { ConfirmationRestrictionConfig } from "../../../data/lovelace/config/action";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";

export const confirmAction = async (
  node: HTMLElement,
  hass: HomeAssistant,
  config: ConfirmationRestrictionConfig,
  action: string
): Promise<boolean> => {
  if (
    config.exemptions &&
    config.exemptions.some((e) => e.user === hass!.user?.id)
  ) {
    return true;
  }

  return showConfirmationDialog(node, {
    text:
      config.text ||
      hass.localize("ui.panel.lovelace.cards.actions.action_confirmation", {
        action,
      }),
  });
};
