import { ContextProvider } from "@lit/context";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import {
  applyThemesOnElement,
  invalidateThemeCache,
} from "../common/dom/apply_themes_on_element";
import { fireEvent } from "../common/dom/fire_event";
import { computeFormatFunctions } from "../common/translations/entity-state";
import { computeLocalize } from "../common/translations/localize";
import {
  apiContext,
  areasContext,
  configContext,
  connectionContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  formattersContext,
  internationalizationContext,
  registriesContext,
  servicesContext,
  statesContext,
  uiContext,
} from "../data/context";
import { updateHassGroups } from "../data/context/updateContext";
import type { IconCategory } from "../data/icons";
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
import { ENTITY_COMPONENT_ICONS } from "./entity_component_icons";
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

interface MockGetIconsMessage {
  type: "frontend/get_icons";
  category: IconCategory;
  integration?: string;
}

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
  // Register a loader that is run (once) the first time an unmocked WS command
  // or REST path matching `shouldLoad` is received, allowing mocks to be
  // code-split into a dynamically imported chunk. The loader registers the
  // missing mocks; the command is then retried.
  mockLazyLoad(
    shouldLoad: (commandOrPath: string) => boolean,
    loader: () => Promise<unknown>
  );
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
  setHassProperty = false,
  // Provide the grouped Lit contexts (registries, internationalization, api,
  // connection, ui, config, formatters) that the real app's root element
  // provides via `contextMixin`. On by default so that any standalone hass root
  // (e.g. a gallery demo) automatically feeds context-consuming components the
  // same way the real app does, instead of each demo wiring up a partial set by
  // hand. Pass `false` for hosts that already provide these contexts themselves
  // via `contextMixin` (the full app shell — `ha-demo`, `ha-test`), to avoid
  // registering duplicate providers on the same element.
  provideContexts = true
): MockHomeAssistant => {
  elements = ensureArray(elements);
  // Can happen because we store sidebar, more info etc on hass.
  const baseEl = () => elements[0];
  const hass = (): MockHomeAssistant => baseEl().hass;

  const contextProviders = provideContexts
    ? {
        registries: new ContextProvider(baseEl(), {
          context: registriesContext,
        }),
        internationalization: new ContextProvider(baseEl(), {
          context: internationalizationContext,
        }),
        api: new ContextProvider(baseEl(), { context: apiContext }),
        connection: new ContextProvider(baseEl(), {
          context: connectionContext,
        }),
        ui: new ContextProvider(baseEl(), { context: uiContext }),
        config: new ContextProvider(baseEl(), { context: configContext }),
        formatters: new ContextProvider(baseEl(), {
          context: formattersContext,
        }),
      }
    : undefined;

  // The individual (non-grouped) contexts that contextMixin also provides.
  // Components such as ha-area-picker / ha-entity-picker consume these directly
  // (e.g. `Object.values(areas)`), so they must be provided alongside the
  // grouped contexts or those components throw once they render.
  const singleContextProviders = provideContexts
    ? {
        states: new ContextProvider(baseEl(), { context: statesContext }),
        services: new ContextProvider(baseEl(), { context: servicesContext }),
        entities: new ContextProvider(baseEl(), { context: entitiesContext }),
        devices: new ContextProvider(baseEl(), { context: devicesContext }),
        areas: new ContextProvider(baseEl(), { context: areasContext }),
        floors: new ContextProvider(baseEl(), { context: floorsContext }),
      }
    : undefined;

  const updateContextProviders = (newHass: HomeAssistant) => {
    if (contextProviders) {
      (
        Object.keys(contextProviders) as (keyof typeof contextProviders)[]
      ).forEach((group) => {
        const provider = contextProviders[group];
        provider.setValue(
          (updateHassGroups[group] as (h: HomeAssistant, v?: any) => any)(
            newHass,
            provider.value
          )
        );
      });
    }
    if (singleContextProviders) {
      (
        Object.keys(
          singleContextProviders
        ) as (keyof typeof singleContextProviders)[]
      ).forEach((key) => {
        (singleContextProviders[key] as ContextProvider<any>).setValue(
          newHass[key]
        );
      });
    }
  };

  const wsCommands = {};
  const restResponses: [string | RegExp, MockRestCallback][] = [];

  // Optional loader to lazily register mocks on first matching unmocked command.
  let lazyMatcher: ((commandOrPath: string) => boolean) | undefined;
  let lazyLoader: (() => Promise<unknown>) | undefined;
  let lazyLoaderPromise: Promise<unknown> | undefined;
  const ensureLazyLoaded = () => {
    if (!lazyLoaderPromise) {
      lazyLoaderPromise = lazyLoader!();
    }
    return lazyLoaderPromise;
  };
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
      hass().floors
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
        let callback = wsCommands[msg.type];
        if (!callback && lazyMatcher?.(msg.type)) {
          await ensureLazyLoaded();
          callback = wsCommands[msg.type];
        }
        return callback
          ? callback(msg, hass())
          : Promise.reject({
              code: "command_not_mocked",
              message: `WS Command ${msg.type} is not implemented in provide_hass.`,
            });
      },
      subscribeMessage: async (onChange, msg) => {
        let callback = wsCommands[msg.type];
        if (!callback && lazyMatcher?.(msg.type)) {
          await ensureLazyLoaded();
          callback = wsCommands[msg.type];
        }
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
      const findResponse = () =>
        restResponses.find(([resPath]) =>
          typeof resPath === "string" ? path === resPath : resPath.test(path)
        );

      let response = findResponse();
      if (!response && lazyMatcher?.(path)) {
        await ensureLazyLoaded();
        response = findResponse();
      }

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
      updateContextProviders(newHass);
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
    mockLazyLoad(shouldLoad, loader) {
      lazyMatcher = shouldLoad;
      lazyLoader = loader;
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
    formatEntityName: (stateObj, type) =>
      typeof type === "string"
        ? type
        : (stateObj.attributes.friendly_name ?? stateObj.entity_id),
    ...overrideData,
  };

  hassObj.mockWS("frontend/get_icons", ({ category }: MockGetIconsMessage) => ({
    resources: category === "entity_component" ? ENTITY_COMPONENT_ICONS : {},
  }));

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
