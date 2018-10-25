import { fireEvent } from "../../../src/common/dom/fire_event.js";

import { demoConfig } from "./demo_config.js";
import { demoServices } from "./demo_services";
import demoResources from "./demo_resources.js";

const ensureArray = (val) => (Array.isArray(val) ? val : [val]);

export default (elements, { initialStates = {} } = {}) => {
  elements = ensureArray(elements);

  const wsCommands = {};
  let hass;
  const entities = {};

  function updateHass(obj) {
    hass = Object.assign({}, hass, obj);
    elements.forEach((el) => {
      el.hass = hass;
    });
  }

  updateHass({
    // Home Assistant properties
    config: demoConfig,
    services: demoServices,
    language: "en",
    resources: demoResources,
    states: initialStates,
    themes: {},

    // Mock properties
    mockEntities: entities,

    // Home Assistant functions
    async callService(domain, service, data) {
      fireEvent(elements[0], "show-notification", {
        message: `Called service ${domain}/${service}`,
      });
      if (data.entity_id) {
        await Promise.all(
          ensureArray(data.entity_id).map((ent) =>
            entities[ent].handleService(domain, service, data)
          )
        );
      } else {
        console.log("unmocked callService", domain, service, data);
      }
    },

    async callWS(msg) {
      const callback = wsCommands[msg.type];
      return callback
        ? callback(msg)
        : Promise.reject({
            code: "command_not_mocked",
            message: "This command is not implemented in the gallery.",
          });
    },

    async sendWS(msg) {
      const callback = wsCommands[msg.type];

      if (callback) {
        callback(msg);
      } else {
        console.error(`Unknown command: ${msg.type}`);
      }
      console.log("sendWS", msg);
    },

    // Mock functions
    updateHass,
    updateStates(newStates) {
      updateHass({
        states: Object.assign({}, hass.states, newStates),
      });
    },
    addEntities(newEntities) {
      const states = {};
      ensureArray(newEntities).forEach((ent) => {
        ent.hass = hass;
        entities[ent.entityId] = ent;
        states[ent.entityId] = ent.toState();
      });
      this.updateStates(states);
    },
  });

  return hass;
};
