import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import { fireEvent } from "../common/dom/fire_event";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { computeLocalize } from "../common/translations/localize";
import type { EntityRegistryDisplayEntry } from "../data/entity/entity_registry";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import type { HomeAssistant, Resources, ValuePart } from "../types";
import { getLocalLanguage, getTranslation } from "../util/common-translation";
import { demoConfig } from "./demo_config";
import { demoPanels } from "./demo_panels";
import { demoServices } from "./demo_services";
import { getEntity } from "./entities/registry";
import type { EntityInput } from "./entities/types";

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
  addEntities(entities: EntityInput | EntityInput[], replace?: boolean);
  updateTranslations(fragment: null | string, language?: string);
  addTranslations(translations: Record<string, string>, language?: string);
  mockWS<T extends (...args) => any = any>(
    type: string,
    callback: (
      msg: any,
      hass: MockHomeAssistant,
      onChange?: (response: any) => void
    ) => Awaited<ReturnType<T>>
  );
  mockAPI(path: string | RegExp, callback: MockRestCallback);
  mockEvent(event);
  mockTheme(theme: Record<string, string> | null);
  formatEntityState(stateObj: HassEntity, state?: string): string;
  formatEntityStateToParts(stateObj: HassEntity, state?: string): ValuePart[];
  formatEntityAttributeValue(
    stateObj: HassEntity,
    attribute: string,
    value?: any
  ): string;
  formatEntityAttributeValueToParts(
    stateObj: HassEntity,
    attribute: string,
    value?: any
  ): ValuePart[];
  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
}

export const provideHass = (
  elements,
  overrideData: Partial<HomeAssistant> = {},
  setHassProperty = false
): MockHomeAssistant => {
  elements = ensureArray(elements);
  // Can happen because we store sidebar, more info etc on hass.
  const baseEl = () => elements[0];
  const hass = (): MockHomeAssistant => baseEl().hass;

  const wsCommands = {};
  const restResponses: [string | RegExp, MockRestCallback][] = [];
  const eventListeners: Record<string, ((event) => void)[]> = {};
  const entities = {};
  let localResources: Resources = {};

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
    const base = baseEl();
    const baseHasResources = Object.prototype.hasOwnProperty.call(
      base,
      "__resources"
    );
    let resources: Resources;
    if (baseHasResources) {
      resources = base.__resources as Resources;
    } else {
      resources = localResources;
    }
    resources = {
      [lang]: {
        ...resources[lang],
        ...translations,
      },
    };
    if (baseHasResources) {
      base.__resources = resources;
    } else {
      localResources = resources;
    }

    hass().updateHass({
      localize: await computeLocalize(elements[0], lang, resources),
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
      formatEntityStateToParts,
      formatEntityAttributeName,
      formatEntityAttributeValue,
      formatEntityAttributeValueToParts,
      formatEntityName,
    } = await computeFormatFunctions(
      hass().localize,
      hass().locale,
      hass().config,
      hass().entities,
      hass().devices,
      hass().areas,
      hass().floors,
      [] // numericDeviceClasses
    );
    hass().updateHass({
      formatEntityState,
      formatEntityStateToParts,
      formatEntityAttributeName,
      formatEntityAttributeValue,
      formatEntityAttributeValueToParts,
      formatEntityName,
    });
  }

  function addEntities(
    newEntities: EntityInput | EntityInput[],
    replace = false
  ) {
    const states = {};
    ensureArray(newEntities).forEach((input) => {
      const ent = getEntity(input);
      ent.hass = hass();
      entities[ent.entityId] = ent;
      states[ent.entityId] = ent.toState();

      hass().entities[ent.entityId] = {
        entity_id: ent.entityId,
        name: ent.attributes.friendly_name || undefined,
        icon: undefined,
        platform: "demo",
        labels: [],
      } satisfies EntityRegistryDisplayEntry;
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

  mockAPI(/states\/.+/, (_method, path, parameters) => {
    const entityId = path.slice(7);
    if (!entityId.includes(".")) {
      return;
    }
    addEntities({
      entity_id: entityId,
      state: parameters.state,
      attributes: parameters.attributes,
    });
  });

  const localLanguage = getLocalLanguage();
  const noop = () => undefined;

  const hassObj: MockHomeAssistant = {
    // Home Assistant properties
    auth: {
      data: {
        hassUrl: location.origin,
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
      ping: noop,
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
    selectedTheme: {
      theme: "default",
      dark: false,
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
    systemData: {
      default_panel: "lovelace",
    },
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
    localize: () => "",

    translationMetadata: translationMetadata as any,
    async loadBackendTranslation() {
      return hass().localize;
    },
    dockedSidebar: "auto",
    vibrate: true,
    debugConnection: false,
    kioskMode: false,
    suspendWhenHidden: false,
    // @ts-ignore
    async callService(domain, service, data) {
      if (data && "entity_id" in data) {
        // eslint-disable-next-line
        console.log("Entity service call", domain, service, data);
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
        selectedTheme: { theme: theme ? "mock" : "default", dark: false },
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
        { dark: false },
        true
      );
    },
    areas: {},
    devices: {},
    entities: {},
    floors: {},
    formatEntityState: (stateObj, state) =>
      (state !== null ? state : stateObj.state) ?? "",
    formatEntityStateToParts: (stateObj, state) => [
      {
        type: "value",
        value: (state !== null ? state : stateObj.state) ?? "",
      },
    ],
    formatEntityAttributeName: (_stateObj, attribute) => attribute,
    formatEntityAttributeValue: (stateObj, attribute, value) =>
      value !== null ? value : (stateObj.attributes[attribute] ?? ""),
    formatEntityAttributeValueToParts: (stateObj, attribute, value) => [
      {
        type: "value",
        value: value !== null ? value : (stateObj.attributes[attribute] ?? ""),
      },
    ],
    ...overrideData,
  };

  // Set hass if required
  if (setHassProperty) {
    elements.forEach((el) => {
      el.hass = hassObj;
    });
  }

  // Update the elements. Note, we call it on hassObj so that if it was
  // overridden (like in the demo), it will still work.
  hassObj.updateHass(hassObj);

  // @ts-ignore
  return hassObj;
};
