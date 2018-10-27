import { HomeAssistant } from "../../types";
import { LovelaceElementConfig } from "../../panels/lovelace/elements/types";
import { fireEvent } from "../dom/fire_event.js";
import toggleEntity from "../../../src/panels/lovelace/common/entity/toggle-entity";

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
      // this.navigate(config.navigation_path); // TODO wait for balloob's navigate function
      break;
    case "toggle":
      toggleEntity(hass, config.entity);
      break;
    case "call-service": {
      if (config.service) {
        const [domain, service] = config.service.split(".", 2);
        const serviceData = Object.assign(
          {},
          { entity_id: config.entity },
          config.service_data
        );
        hass.callService(domain, service, serviceData);
      }
    }
  }
};
