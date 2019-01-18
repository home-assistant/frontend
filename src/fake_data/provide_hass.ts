import { fireEvent } from "../common/dom/fire_event";

import { demoConfig } from "./demo_config";
import { demoServices } from "./demo_services";
import { demoResources } from "./demo_resources";
import { demoPanels } from "./demo_panels";
import { getEntity, Entity } from "./entity";
import { HomeAssistant } from "../types";
import { HassEntities } from "home-assistant-js-websocket";

const ensureArray = <T>(val: T | T[]): T[] =>
  Array.isArray(val) ? val : [val];

interface MockHomeAssistant extends HomeAssistant {
  mockEntities: any;
  updateHass(obj: Partial<MockHomeAssistant>);
  updateStates(newStates: HassEntities);
  addEntities(entites: Entity | Entity[]);
  mockWS(type: string, callback: (msg: any) => any);
  mockAPI(
    path: string,
    callback: (
      method: string,
      path: string,
      parameters: { [key: string]: any }
    ) => any
  );
}

export const provideHass = (
  elements,
  { initialStates = {} } = {}
): MockHomeAssistant => {
  elements = ensureArray(elements);

  const wsCommands = {};
  const restResponses = {};
  let hass: MockHomeAssistant;
  const entities = {};

  function updateHass(obj: Partial<MockHomeAssistant>) {
    hass = { ...hass, ...obj };
    elements.forEach((el) => {
      el.hass = hass;
    });
  }

  function updateStates(newStates: HassEntities) {
    updateHass({
      states: { ...hass.states, ...newStates },
    });
  }

  function addEntities(newEntities) {
    const states = {};
    ensureArray(newEntities).forEach((ent) => {
      ent.hass = hass;
      entities[ent.entityId] = ent;
      states[ent.entityId] = ent.toState();
    });
    updateStates(states);
  }

  function mockUpdateStateAPI(
    // @ts-ignore
    method,
    path,
    parameters
  ) {
    const [domain, objectId] = path.substr(7).split(".", 2);
    if (!domain || !objectId) {
      return;
    }
    addEntities(
      getEntity(domain, objectId, parameters.state, parameters.attributes)
    );
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
    panels: demoPanels,
    connection: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      sendMessagePromise: () =>
        new Promise(() => {
          /* we never resolve */
        }),
      subscribeEvents: async (
        // @ts-ignore
        callback,
        event
      ) => {
        // tslint:disable-next-line
        console.log("subscribeEvents", event);
        // tslint:disable-next-line
        return () => console.log("unsubscribeEvents", event);
      },
      socket: {
        readyState: WebSocket.OPEN,
      },
    } as any,
    translationMetadata: {
      fragments: [],
      translations: {},
    },

    // Mock properties
    mockEntities: entities,

    // Home Assistant functions
    async callService(domain, service, data) {
      fireEvent(elements[0], "hass-notification", {
        message: `Called service ${domain}/${service}`,
      });
      if (data && "entity_id" in data) {
        await Promise.all(
          ensureArray(data.entity_id).map((ent) =>
            entities[ent].handleService(domain, service, data)
          )
        );
      } else {
        // tslint:disable-next-line
        console.log("unmocked callService", domain, service, data);
      }
    },

    async callWS(msg) {
      const callback = wsCommands[msg.type];
      return callback
        ? callback(msg)
        : Promise.reject({
            code: "command_not_mocked",
            message: `Command ${msg.type} is not implemented in provide_hass.`,
          });
    },

    async sendWS(msg) {
      const callback = wsCommands[msg.type];

      if (callback) {
        callback(msg);
      } else {
        // tslint:disable-next-line
        console.error(`Unknown command: ${msg.type}`);
      }
      // tslint:disable-next-line
      console.log("sendWS", msg);
    },

    async callApi(method, path, parameters) {
      const callback =
        path.substr(0, 7) === "states/"
          ? mockUpdateStateAPI
          : restResponses[path];

      return callback
        ? callback(method, path, parameters)
        : Promise.reject(`Mock for ${path} is not implemented`);
    },

    // Mock functions
    updateHass,
    updateStates,
    addEntities,
    mockWS(type, callback) {
      wsCommands[type] = callback;
    },
    mockAPI(path, callback) {
      restResponses[path] = callback;
    },
  });

  // @ts-ignore
  return hass;
};
