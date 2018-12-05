import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import { toggleEntity } from "../../../../src/panels/lovelace/common/entity/toggle-entity";
import { LovelaceCardConfig, ActionConfig } from "../../../data/lovelace";
import { EntityConfig } from "../entity-rows/types";

export interface ConfigEntity extends EntityConfig {
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export const handleClick = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: LovelaceElementConfig | LovelaceCardConfig | ConfigEntity,
  hold: boolean
): void => {
  let actionConfig;
  if (hold && config.hold_action) {
    actionConfig = config.hold_action;
  } else if (!hold && config.tap_action) {
    actionConfig = config.tap_action;
  }

  const action =
    actionConfig && actionConfig.action ? actionConfig.action : "more-info";

  if (action === "none") {
    return;
  }

  switch (action) {
    case "more-info":
      if (config.entity) {
        fireEvent(node, "hass-more-info", { entityId: config.entity });
      }
      break;
    case "navigate":
      navigate(
        node,
        actionConfig.navigation_path ? actionConfig.navigation_path : ""
      );
      break;
    case "toggle":
      toggleEntity(hass, config.entity!);
      break;
    case "call-service": {
      if (!actionConfig.service) {
        return;
      }
      const [domain, service] = actionConfig.service.split(".", 2);
      const serviceData = {
        entity_id: config.entity,
        ...actionConfig.service_data,
      };
      hass.callService(domain, service, serviceData);
    }
  }
};
