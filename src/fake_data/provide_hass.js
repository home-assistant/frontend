import { fireEvent } from "../common/dom/fire_event";

import { demoConfig } from "./demo_config";
import { demoServices } from "./demo_services";
import demoResources from "./demo_resources";

const ensureArray = (val) => (Array.isArray(val) ? val : [val]);

export const provideHass = (elements, { initialStates = {} } = {}) => {
  elements = ensureArray(elements);

  const wsCommands = {};
  const restResponses = {};
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
    themes: {
      default_theme: "default",
      themes: {},
    },
    panelUrl: "lovelace",
    panels: {
      lovelace: {
        component_name: "lovelace",
        config: {
          mode: "storage",
        },
      },
    },
    connection: {
      addEventListener: () => {},
      removeEventListener: () => {},
      sendMessagePromise: () =>
        new Promise(() => {
          /* we never resolve */
        }),
      subscribeEvents: async (callback, event) => {
        console.log("subscribeEvents", event);
        return () => console.log("unsubscribeEvents", event);
      },
      socket: {
        readyState: WebSocket.OPEN,
      },
    },
    translationMetadata: {
      translations: {},
    },

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
            message: "This command is not implemented in provide_hass.",
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

    async callApi(method, path, parameters) {
      const callback = restResponses[path];

      return callback
        ? callback(method, path, parameters)
        : Promise.reject(`Mock for {path} is not implemented`);
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
    mockWS(type, callback) {
      wsCommands[type] = callback;
    },
    mockAPI(path, callback) {
      restResponses[path] = callback;
    },
  });

  return hass;
};
