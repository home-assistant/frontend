import { HassEntities, HassEntity } from "home-assistant-js-websocket";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import { fireEvent } from "../common/dom/fire_event";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { computeLocalize } from "../common/translations/localize";
import { DEFAULT_PANEL } from "../data/panel";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import { HomeAssistant } from "../types";
import { getLocalLanguage, getTranslation } from "../util/common-translation";
import { demoConfig } from "./demo_config";
import { demoPanels } from "./demo_panels";
import { demoServices } from "./demo_services";
import { Entity, getEntity } from "./entity";

const ensureArray = <T>(val: T | T[]): T[] =>
  Array.isArray(val) ? val : [val];

type MockRestCallback = (
  hass: MockHomeAssistant,
  method: string,
  path: string,
  parameters: Record<string, any> | undefined
) => any;

export interface MockHomeAssistant extends HomeAssistant {
  mockEntities: any;
  updateHass(obj: Partial<MockHomeAssistant>);
  updateStates(newStates: HassEntities);
  addEntities(entites: Entity | Entity[], replace?: boolean);
  updateTranslations(fragment: null | string, language?: string);
  addTranslations(translations: Record<string, string>, language?: string);
  mockWS(
    type: string,
    callback: (
      msg: any,
      hass: MockHomeAssistant,
      onChange?: (response: any) => void
    ) => any
  );
  mockAPI(path: string | RegExp, callback: MockRestCallback);
  mockEvent(event);
  mockTheme(theme: Record<string, string> | null);
  formatEntityState(stateObj: HassEntity, state?: string): string;
  formatEntityAttributeValue(
    stateObj: HassEntity,
    attribute: string,
    value?: any
  ): string;
  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
}

export const provideHass = (
  elements,
  overrideData: Partial<HomeAssistant> = {}
): MockHomeAssistant => {
  elements = ensureArray(elements);
  // Can happen because we store sidebar, more info etc on hass.
  const hass = (): MockHomeAssistant => elements[0].hass;

  const wsCommands = {};
  const restResponses: Array<[string | RegExp, MockRestCallback]> = [];
  const eventListeners: {
    [event: string]: Array<(event) => void>;
  } = {};
  const entities = {};

  async function updateTranslations(
    fragment: null | string,
    language?: string
  ) {
    const lang = language || getLocalLanguage();
    const translation = await getTranslation(fragment, lang);
    await addTranslations(translation.data, lang);
    updateFormatFunctions();
  }

  async function addTranslations(
    translations: Record<string, string>,
    language?: string
  ) {
    const lang = language || getLocalLanguage();
    const resources = {
      [lang]: {
        ...(hass().resources && hass().resources[lang]),
        ...translations,
      },
    };
    hass().updateHass({
      resources,
    });
    hass().updateHass({
      localize: await computeLocalize(elements[0], lang, hass().resources),
    });
    fireEvent(window, "translations-updated");
  }

  function updateStates(newStates: HassEntities) {
    hass().updateHass({
      states: { ...hass().states, ...newStates },
    });
  }

  async function updateFormatFunctions() {
    const {
      formatEntityState,
      formatEntityAttributeName,
      formatEntityAttributeValue,
    } = await computeFormatFunctions(
      hass().localize,
      hass().locale,
      hass().config,
      hass().entities
    );
    hass().updateHass({
      formatEntityState,
      formatEntityAttributeName,
      formatEntityAttributeValue,
    });
  }

  function addEntities(newEntities, replace = false) {
    const states = {};
    ensureArray(newEntities).forEach((ent) => {
      ent.hass = hass();
      entities[ent.entityId] = ent;
      states[ent.entityId] = ent.toState();
    });
    if (replace) {
      hass().updateHass({
        states,
      });
    } else {
      updateStates(states);
    }
    updateFormatFunctions();
  }

  function mockAPI(path, callback) {
    restResponses.push([path, callback]);
  }

  mockAPI(
    /states\/.+/,
    (
      // @ts-ignore
      method,
      path,
      parameters
    ) => {
      const [domain, objectId] = path.substr(7).split(".", 2);
      if (!domain || !objectId) {
        return;
      }
      addEntities(
        getEntity(domain, objectId, parameters.state, parameters.attributes)
      );
    }
  );

  const localLanguage = getLocalLanguage();
  const noop = () => undefined;

  const hassObj: MockHomeAssistant = {
    // Home Assistant properties
    auth: {
      data: {
        hassUrl: "",
      },
    } as any,
    connection: {
      addEventListener: noop,
      removeEventListener: noop,
      sendMessage: (msg) => {
        const callback = wsCommands[msg.type];

        if (callback) {
          callback(msg, hass());
        } else {
          // eslint-disable-next-line
          console.error(`Unknown WS command: ${msg.type}`);
        }
      },
      sendMessagePromise: async (msg) => {
        const callback = wsCommands[msg.type];
        return callback
          ? callback(msg, hass())
          : Promise.reject({
              code: "command_not_mocked",
              message: `WS Command ${msg.type} is not implemented in provide_hass.`,
            });
      },
      subscribeMessage: async (onChange, msg) => {
        const callback = wsCommands[msg.type];
        return callback
          ? callback(msg, hass(), onChange)
          : Promise.reject({
              code: "command_not_mocked",
              message: `WS Command ${msg.type} is not implemented in provide_hass.`,
            });
      },
      subscribeEvents: async (
        // @ts-ignore
        callback,
        event
      ) => {
        if (!(event in eventListeners)) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
        return () => {
          eventListeners[event] = eventListeners[event].filter(
            (cb) => cb !== callback
          );
        };
      },
      suspendReconnectUntil: noop,
      suspend: noop,
      socket: {
        readyState: WebSocket.OPEN,
      },
      haVersion: "DEMO",
    } as any,
    connected: true,
    states: {},
    config: demoConfig,
    themes: {
      default_theme: "default",
      default_dark_theme: null,
      themes: {},
      darkMode: false,
      theme: "default",
    },
    panels: demoPanels,
    services: demoServices,
    user: {
      credentials: [],
      id: "abcd",
      is_admin: true,
      is_owner: true,
      mfa_modules: [],
      name: "Demo User",
    },
    panelUrl: "lovelace",
    defaultPanel: DEFAULT_PANEL,
    language: localLanguage,
    selectedLanguage: localLanguage,
    locale: {
      language: localLanguage,
      number_format: NumberFormat.language,
      time_format: TimeFormat.language,
      date_format: DateFormat.language,
      time_zone: TimeZone.local,
      first_weekday: FirstWeekday.language,
    },
    resources: null as any,
    localize: () => "",

    translationMetadata: translationMetadata as any,
    async loadBackendTranslation() {
      return hass().localize;
    },
    dockedSidebar: "auto",
    vibrate: true,
    debugConnection: false,
    suspendWhenHidden: false,
    moreInfoEntityId: null as any,
    // @ts-ignore
    async callService(domain, service, data) {
      if (data && "entity_id" in data) {
        await Promise.all(
          ensureArray(data.entity_id).map((ent) =>
            entities[ent].handleService(domain, service, data)
          )
        );
      } else {
        // eslint-disable-next-line
        console.log("unmocked callService", domain, service, data);
      }
    },
    async callApi(method, path, parameters) {
      const response = restResponses.find(([resPath]) =>
        typeof resPath === "string" ? path === resPath : resPath.test(path)
      );

      return response
        ? response[1](hass(), method, path, parameters)
        : Promise.reject(`API Mock for ${path} is not implemented`);
    },
    hassUrl: (path?) => path,
    fetchWithAuth: () => Promise.reject("Not implemented"),
    sendWS: (msg) => hassObj.connection.sendMessage(msg),
    callWS: (msg) => hassObj.connection.sendMessagePromise(msg),

    // Mock stuff
    mockEntities: entities,
    updateHass(obj: Partial<MockHomeAssistant>) {
      const newHass = { ...hass(), ...obj };
      elements.forEach((el) => {
        el.hass = newHass;
      });
    },
    updateStates,
    updateTranslations,
    addTranslations,
    loadFragmentTranslation: async (fragment: string) => {
      await updateTranslations(fragment);
      return hass().localize;
    },
    addEntities,
    mockWS(type, callback) {
      wsCommands[type] = callback;
    },
    mockAPI,
    mockEvent(event) {
      (eventListeners[event] || []).forEach((fn) => fn(event));
    },
    mockTheme(theme) {
      invalidateThemeCache();
      hass().updateHass({
        selectedTheme: { theme: theme ? "mock" : "default" },
        themes: {
          ...hass().themes,
          themes: {
            mock: theme as any,
          },
        },
      });
      const { themes, selectedTheme } = hass();
      applyThemesOnElement(
        document.documentElement,
        themes,
        selectedTheme!.theme,
        undefined,
        true
      );
    },
    areas: {},
    devices: {},
    entities: {},
    formatEntityState: (stateObj, state) =>
      (state !== null ? state : stateObj.state) ?? "",
    formatEntityAttributeName: (_stateObj, attribute) => attribute,
    formatEntityAttributeValue: (stateObj, attribute, value) =>
      value !== null ? value : stateObj.attributes[attribute] ?? "",
    ...overrideData,
  };

  // Update the elements. Note, we call it on hassObj so that if it was
  // overridden (like in the demo), it will still work.
  hassObj.updateHass(hassObj);

  // @ts-ignore
  return hassObj;
};
