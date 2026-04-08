import { createContext } from "@lit/context";
import type { HassConfig } from "home-assistant-js-websocket";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantConnection,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
  HomeAssistantUI,
} from "../../types";
import type { ConfigEntry } from "../config_entries";
import type { EntityRegistryEntry } from "../entity/entity_registry";
import type { LabelRegistryEntry } from "../label/label_registry";

/**
 * Entity, device, area, and floor registries
 */
export const registriesContext =
  createContext<HomeAssistantRegistries>("hassRegistries");

/**
 * Live map of all entity states, keyed by entity ID.
 */
export const statesContext = createContext<HomeAssistant["states"]>("states");

/**
 * Provides the map of all available Home Assistant services, keyed by domain.
 */
export const servicesContext =
  createContext<HomeAssistant["services"]>("services");

/**
 * i18n state: active language, locale settings, the `localize` function, translation metadata, and the
 * `loadBackendTranslation` / `loadFragmentTranslation` loaders.
 */
export const internationalizationContext =
  createContext<HomeAssistantInternationalization>("hassInternationalization");

/**
 * HTTP and WebSocket API surface: `callService`, `callApi`,
 * `callApiRaw`, `callWS`, `sendWS`, `fetchWithAuth`, and `hassUrl`.
 */
export const apiContext = createContext<HomeAssistantApi>("hassApi");

/**
 * WebSocket connection state: `connection`, `connected`, and `debugConnection`.
 */
export const connectionContext =
  createContext<HomeAssistantConnection>("hassConnection");

/**
 * UI preferences and global UI state: themes, selected theme,
 * panels, sidebar mode, kiosk mode, shortcuts, vibration, and
 * `suspendWhenHidden`.
 */
export const uiContext = createContext<HomeAssistantUI>("hassUi");

/**
 * HA core configuration together with user session data:
 * `auth`, `config` (core HA config), `user`, `userData`, and `systemData`.
 */
export const configContext = createContext<HomeAssistantConfig>("hassConfig");

/**
 * Map of all entities in the entity registry, keyed by entity ID.
 */
export const entitiesContext =
  createContext<HomeAssistant["entities"]>("entities");

/**
 * Map of all devices in the device registry, keyed by device ID.
 */
export const devicesContext =
  createContext<HomeAssistant["devices"]>("devices");

/**
 * Map of all areas in the area registry, keyed by area ID.
 */
export const areasContext = createContext<HomeAssistant["areas"]>("areas");

/**
 * Map of all floors in the floor registry, keyed by floor ID.
 */
export const floorsContext = createContext<HomeAssistant["floors"]>("floors");

// #region lazy-contexts

/**
 * Lazy contexts are not subscribed to by default. They are only subscribed to when a provider is consumed with at least one consumer.
 */

/**
 * Lazy loaded labels registry, keyed by label ID.
 */
export const labelsContext = createContext<LabelRegistryEntry[]>("labels");

/**
 * Lazy loaded entity registry array
 */
export const fullEntitiesContext =
  createContext<EntityRegistryEntry[]>("extendedEntities");

/**
 * Lazy loaded config entries array
 */
export const configEntriesContext =
  createContext<ConfigEntry[]>("configEntries");

// #endregion lazy-contexts

// #region deprecated-contexts

/** @deprecated Use `connectionContext` instead. */
export const connectionSingleContext =
  createContext<HomeAssistant["connection"]>("connection");

/** @deprecated Use `internationalizationContext` instead. */
export const localizeContext =
  createContext<HomeAssistant["localize"]>("localize");

/** @deprecated Use `internationalizationContext` instead. */
export const localeContext = createContext<HomeAssistant["locale"]>("locale");

/** @deprecated Use `configContext` instead. */
export const configSingleContext = createContext<HassConfig>("config");

/** @deprecated Use `uiContext` instead. */
export const themesContext = createContext<HomeAssistant["themes"]>("themes");

/** @deprecated Use `uiContext` instead. */
export const selectedThemeContext =
  createContext<HomeAssistant["selectedTheme"]>("selectedTheme");

/** @deprecated Use `configContext` instead. */
export const userContext = createContext<HomeAssistant["user"]>("user");

/** @deprecated Use `configContext` instead. */
export const userDataContext =
  createContext<HomeAssistant["userData"]>("userData");

/** @deprecated Use `uiContext` instead. */
export const panelsContext = createContext<HomeAssistant["panels"]>("panels");

/** @deprecated Use `configContext` instead. */
export const authContext = createContext<HomeAssistant["auth"]>("auth");

// #endregion deprecated-contexts
