import { HomeAssistant } from "../../../types";
import { LovelaceElementConfig } from "../elements/types";
import { fireEvent } from "../../../common/dom/fire_event.js";
import { navigate } from "../../../common/navigate";
import toggleEntity from "../../../../src/panels/lovelace/common/entity/toggle-entity";

export const handleClick = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: LovelaceElementConfig,
  hold: boolean
): void => {
  let action = config.tap_action || "more-info";

  if (hold && config.hold_action) {
    action = config.hold_action;
  }

  if (action === "none") {
    return;
  }

  switch (action) {
    case "more-info":
      fireEvent(node, "hass-more-info", { entityId: config.entity });
      break;
    case "navigate":
      navigate(node, config.navigation_path ? config.navigation_path : "");
      break;
    case "toggle":
      toggleEntity(hass, config.entity);
      break;
    case "call-service": {
      if (config.service) {
        const [domain, service] = config.service.split(".", 2);
        const serviceData = {
          entity_id: config.entity,
          ...config.service_data,
        };
        hass.callService(domain, service, serviceData);
      }
    }
  }
};
