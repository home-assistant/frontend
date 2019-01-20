import { fireEvent } from "../common/dom/fire_event";

import { demoConfig } from "./demo_config";
import { demoServices } from "./demo_services";
import { demoPanels } from "./demo_panels";
import { getEntity, Entity } from "./entity";
import { HomeAssistant } from "../types";
import { HassEntities } from "home-assistant-js-websocket";
import { getActiveTranslation } from "../util/hass-translation";
import { translationMetadata } from "../resources/translations-metadata";

const ensureArray = <T>(val: T | T[]): T[] =>
  Array.isArray(val) ? val : [val];

export interface MockHomeAssistant extends HomeAssistant {
  mockEntities: any;
  updateHass(obj: Partial<MockHomeAssistant>);
  updateStates(newStates: HassEntities);
  addEntities(entites: Entity | Entity[], replace?: boolean);
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
  overrideData: Partial<HomeAssistant> = {}
): MockHomeAssistant => {
  elements = ensureArray(elements);

  const wsCommands = {};
  const restResponses = {};
  const entities = {};

  function updateHass(obj: Partial<MockHomeAssistant>) {
    const hass = { ...elements[0].hass, ...obj };
    elements.forEach((el) => {
      el.hass = hass;
    });
  }

  function updateStates(newStates: HassEntities) {
    updateHass({
      states: { ...elements[0].hass.states, ...newStates },
    });
  }

  function addEntities(newEntities, replace: boolean = false) {
    const states = {};
    ensureArray(newEntities).forEach((ent) => {
      ent.hass = elements[0].hass;
      entities[ent.entityId] = ent;
      states[ent.entityId] = ent.toState();
    });
    if (replace) {
      updateHass({
        states,
      });
    } else {
      updateStates(states);
    }
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
    auth: {} as any,
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
    connected: true,
    states: {},
    config: demoConfig,
    themes: {
      default_theme: "default",
      themes: {},
    },
    panels: demoPanels,
    services: demoServices,
    user: {
      credentials: [],
      id: "abcd",
      is_owner: true,
      mfa_modules: [],
      name: "Demo User",
    },
    panelUrl: "lovelace",

    language: getActiveTranslation(),
    resources: null,

    translationMetadata,
    dockedSidebar: false,
    moreInfoEntityId: null,
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
    async callApi(method, path, parameters) {
      const callback =
        path.substr(0, 7) === "states/"
          ? mockUpdateStateAPI
          : restResponses[path];

      return callback
        ? callback(method, path, parameters)
        : Promise.reject(`API Mock for ${path} is not implemented`);
    },
    fetchWithAuth: () => Promise.reject("Not implemented"),
    async sendWS(msg) {
      const callback = wsCommands[msg.type];

      if (callback) {
        callback(msg);
      } else {
        // tslint:disable-next-line
        console.error(`Unknown WS command: ${msg.type}`);
      }
      // tslint:disable-next-line
      console.log("sendWS", msg);
    },
    async callWS(msg) {
      const callback = wsCommands[msg.type];
      return callback
        ? callback(msg)
        : Promise.reject({
            code: "command_not_mocked",
            message: `WS Command ${
              msg.type
            } is not implemented in provide_hass.`,
          });
    },

    // Mock stuff
    mockEntities: entities,
    updateHass,
    updateStates,
    addEntities,
    mockWS(type, callback) {
      wsCommands[type] = callback;
    },
    mockAPI(path, callback) {
      restResponses[path] = callback;
    },
    ...overrideData,
  } as MockHomeAssistant);

  // @ts-ignore
  return elements[0].hass;
};
