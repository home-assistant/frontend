import { dedupingMixin } from "@polymer/polymer/lib/utils/mixin.js";
import toggleEntity from "../common/entity/toggle-entity.js";
import NavigateMixin from "../../../mixins/navigate-mixin";
import EventsMixin from "../../../mixins/events-mixin.js";
import computeStateName from "../../../common/entity/compute_state_name";

/*
 * @polymerMixin
 * @appliesMixin EventsMixin
 * @appliesMixin NavigateMixin
 */
export default dedupingMixin(
  (superClass) =>
    class extends NavigateMixin(EventsMixin(superClass)) {
      handleClick(hass, config, hold) {
        let action = config.tap_action || "more-info";
        if (hold) {
          action = config.hold_action;
        }
        if (action === "none") return;

        switch (action) {
          case "more-info":
            this.fire("hass-more-info", { entityId: config.entity });
            break;
          case "navigate":
            this.navigate(config.navigation_path);
            break;
          case "toggle":
            toggleEntity(hass, config.entity);
            break;
          case "call-service": {
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

      computeTooltip(hass, config) {
        if (config.title) return config.title;

        const stateName =
          config.entity in hass.states
            ? computeStateName(hass.states[config.entity])
            : config.entity;

        let tooltip;
        switch (config.tap_action) {
          case "navigate":
            tooltip = `Navigate to ${config.navigation_path}`;
            break;
          case "toggle":
            tooltip = `Toggle ${stateName}`;
            break;
          case "call-service":
            tooltip = `Call service ${config.service}`;
            break;
          default:
            tooltip = `Show more-info: ${stateName}`;
        }

        return tooltip;
      }
    }
);
