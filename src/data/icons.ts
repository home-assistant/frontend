import {
  mdiAccount,
  mdiAirFilter,
  mdiAlert,
  mdiAppleSafari,
  mdiBell,
  mdiBookmark,
  mdiBullhorn,
  mdiButtonPointer,
  mdiCalendar,
  mdiCalendarClock,
  mdiChatSleep,
  mdiClipboardList,
  mdiClock,
  mdiCog,
  mdiCommentAlert,
  mdiCounter,
  mdiEye,
  mdiFlower,
  mdiFormatListBulleted,
  mdiFormTextbox,
  mdiForumOutline,
  mdiGoogleAssistant,
  mdiGoogleCirclesCommunities,
  mdiHomeAutomation,
  mdiImage,
  mdiImageFilterFrames,
  mdiLightbulb,
  mdiMapMarkerRadius,
  mdiMicrophoneMessage,
  mdiPalette,
  mdiRayVertex,
  mdiRemote,
  mdiRobot,
  mdiRobotMower,
  mdiRobotVacuum,
  mdiRoomService,
  mdiScriptText,
  mdiSpeakerMessage,
  mdiStarFourPoints,
  mdiThermostat,
  mdiTimerOutline,
  mdiToggleSwitch,
  mdiWeatherPartlyCloudy,
  mdiWhiteBalanceSunny,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { atLeastVersion } from "../common/config/version";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { stateIcon } from "../common/entity/state_icon";
import type { HomeAssistant } from "../types";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";

import { mdiHomeAssistant } from "../resources/home-assistant-logo-svg";

/** Icon to use when no icon specified for service. */
export const DEFAULT_SERVICE_ICON = mdiRoomService;

/** Icon to use when no icon specified for domain. */
export const DEFAULT_DOMAIN_ICON = mdiBookmark;

/** Fallback icons for each domain */
export const FALLBACK_DOMAIN_ICONS = {
  ai_task: mdiStarFourPoints,
  air_quality: mdiAirFilter,
  alert: mdiAlert,
  automation: mdiRobot,
  calendar: mdiCalendar,
  climate: mdiThermostat,
  configurator: mdiCog,
  conversation: mdiForumOutline,
  counter: mdiCounter,
  date: mdiCalendar,
  datetime: mdiCalendarClock,
  demo: mdiHomeAssistant,
  device_tracker: mdiAccount,
  google_assistant: mdiGoogleAssistant,
  group: mdiGoogleCirclesCommunities,
  homeassistant: mdiHomeAssistant,
  homekit: mdiHomeAutomation,
  image_processing: mdiImageFilterFrames,
  image: mdiImage,
  input_boolean: mdiToggleSwitch,
  input_button: mdiButtonPointer,
  input_datetime: mdiCalendarClock,
  input_number: mdiRayVertex,
  input_select: mdiFormatListBulleted,
  input_text: mdiFormTextbox,
  lawn_mower: mdiRobotMower,
  light: mdiLightbulb,
  notify: mdiCommentAlert,
  number: mdiRayVertex,
  persistent_notification: mdiBell,
  person: mdiAccount,
  plant: mdiFlower,
  proximity: mdiAppleSafari,
  remote: mdiRemote,
  scene: mdiPalette,
  schedule: mdiCalendarClock,
  script: mdiScriptText,
  select: mdiFormatListBulleted,
  sensor: mdiEye,
  simple_alarm: mdiBell,
  siren: mdiBullhorn,
  stt: mdiMicrophoneMessage,
  sun: mdiWhiteBalanceSunny,
  text: mdiFormTextbox,
  time: mdiClock,
  timer: mdiTimerOutline,
  todo: mdiClipboardList,
  tts: mdiSpeakerMessage,
  vacuum: mdiRobotVacuum,
  wake_word: mdiChatSleep,
  weather: mdiWeatherPartlyCloudy,
  zone: mdiMapMarkerRadius,
};

const resources: {
  entity: Record<string, Promise<PlatformIcons>>;
  entity_component: {
    domains?: string[];
    resources?: Promise<Record<string, ComponentIcons>>;
  };
  services: {
    all?: Promise<Record<string, ServiceIcons>>;
    domains: Record<string, ServiceIcons | Promise<ServiceIcons>>;
  };
} = {
  entity: {},
  entity_component: {},
  services: { domains: {} },
};

interface IconResources<
  T extends ComponentIcons | PlatformIcons | ServiceIcons,
> {
  resources: Record<string, T>;
}

type PlatformIcons = Record<
  string,
  {
    state: Record<string, string>;
    range?: Record<string, string>;
    state_attributes: Record<
      string,
      {
        state: Record<string, string>;
        range?: Record<string, string>;
        default: string;
      }
    >;
    default: string;
  }
>;

export type ComponentIcons = Record<
  string,
  {
    state?: Record<string, string>;
    range?: Record<string, string>;
    state_attributes?: Record<
      string,
      {
        state: Record<string, string>;
        range?: Record<string, string>;
        default: string;
      }
    >;
    default: string;
  }
>;

type ServiceIcons = Record<
  string,
  { service: string; sections?: Record<string, string> }
>;

export type IconCategory = "entity" | "entity_component" | "services";

interface CategoryType {
  entity: PlatformIcons;
  entity_component: ComponentIcons;
  services: ServiceIcons;
}

export const getHassIcons = async <T extends IconCategory>(
  hass: HomeAssistant,
  category: T,
  integration?: string
) =>
  hass.callWS<IconResources<CategoryType[T]>>({
    type: "frontend/get_icons",
    category,
    integration,
  });

export const getPlatformIcons = async (
  hass: HomeAssistant,
  integration: string,
  force = false
): Promise<PlatformIcons | undefined> => {
  if (!force && integration in resources.entity) {
    return resources.entity[integration];
  }
  if (
    !isComponentLoaded(hass, integration) ||
    !atLeastVersion(hass.connection.haVersion, 2024, 2)
  ) {
    return undefined;
  }
  const result = getHassIcons(hass, "entity", integration).then(
    (res) => res?.resources[integration]
  );
  resources.entity[integration] = result;
  return resources.entity[integration];
};

export const getComponentIcons = async (
  hass: HomeAssistant,
  domain: string,
  force = false
): Promise<ComponentIcons | undefined> => {
  // For Cast, old instances can connect to it.
  if (
    __BACKWARDS_COMPAT__ &&
    !atLeastVersion(hass.connection.haVersion, 2024, 2)
  ) {
    return import("../fake_data/entity_component_icons")
      .then((mod) => mod.ENTITY_COMPONENT_ICONS)
      .then((res) => res[domain]);
  }

  if (
    !force &&
    resources.entity_component.resources &&
    resources.entity_component.domains?.includes(domain)
  ) {
    return resources.entity_component.resources.then((res) => res[domain]);
  }

  if (!isComponentLoaded(hass, domain)) {
    return undefined;
  }
  resources.entity_component.domains = [...hass.config.components];
  resources.entity_component.resources = getHassIcons(
    hass,
    "entity_component"
  ).then((result) => result.resources);
  return resources.entity_component.resources.then((res) => res[domain]);
};

export const getServiceIcons = async (
  hass: HomeAssistant,
  domain?: string,
  force = false
): Promise<ServiceIcons | Record<string, ServiceIcons> | undefined> => {
  if (!domain) {
    if (!force && resources.services.all) {
      return resources.services.all;
    }
    resources.services.all = getHassIcons(hass, "services", domain).then(
      (res) => {
        resources.services.domains = res.resources;
        return res?.resources;
      }
    );
    return resources.services.all;
  }
  if (!force && domain in resources.services.domains) {
    return resources.services.domains[domain];
  }
  if (resources.services.all && !force) {
    await resources.services.all;
    if (domain in resources.services.domains) {
      return resources.services.domains[domain];
    }
  }
  if (!isComponentLoaded(hass, domain)) {
    return undefined;
  }
  const result = getHassIcons(hass, "services", domain);
  resources.services.domains[domain] = result.then(
    (res) => res?.resources[domain]
  );
  return resources.services.domains[domain];
};

// Cache for sorted range keys
const sortedRangeCache = new WeakMap<Record<string, string>, number[]>();

// Helper function to get an icon from a range of values
const getIconFromRange = (
  value: number,
  range: Record<string, string>
): string | undefined => {
  // Get cached range values or compute and cache them
  let rangeValues = sortedRangeCache.get(range);
  if (!rangeValues) {
    rangeValues = Object.keys(range)
      .map(Number)
      .filter((k) => !isNaN(k))
      .sort((a, b) => a - b);
    sortedRangeCache.set(range, rangeValues);
  }

  if (rangeValues.length === 0) {
    return undefined;
  }

  // If the value is below the first threshold, return undefined
  // (we'll fall back to the default icon)
  if (value < rangeValues[0]) {
    return undefined;
  }

  // Find the highest threshold that's less than or equal to the value
  let selectedThreshold = rangeValues[0];
  for (const threshold of rangeValues) {
    if (value >= threshold) {
      selectedThreshold = threshold;
    } else {
      break;
    }
  }

  return range[selectedThreshold.toString()];
};

// Helper function to get an icon based on state and translations
const getIconFromTranslations = (
  state: string | number | undefined,
  translations:
    | {
        default?: string;
        state?: Record<string, string>;
        range?: Record<string, string>;
      }
    | undefined
): string | undefined => {
  if (!translations) {
    return undefined;
  }

  // First check for exact state match
  if (state && translations.state?.[state]) {
    return translations.state[state];
  }
  // Then check for range-based icons if we have a numeric state
  if (state !== undefined && translations.range && !isNaN(Number(state))) {
    return getIconFromRange(Number(state), translations.range);
  }
  // Fallback to default icon
  return translations.default;
};

export const entityIcon = async (
  hass: HomeAssistant,
  stateObj: HassEntity,
  state?: string
) => {
  const entry = hass.entities?.[stateObj.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  if (entry?.icon) {
    return entry.icon;
  }
  const domain = computeStateDomain(stateObj);

  return getEntityIcon(hass, domain, stateObj, state, entry);
};

export const entryIcon = async (
  hass: HomeAssistant,
  entry: EntityRegistryEntry | EntityRegistryDisplayEntry
) => {
  if (entry.icon) {
    return entry.icon;
  }
  const stateObj = hass.states[entry.entity_id] as HassEntity | undefined;
  const domain = computeDomain(entry.entity_id);
  return getEntityIcon(hass, domain, stateObj, undefined, entry);
};

const getEntityIcon = async (
  hass: HomeAssistant,
  domain: string,
  stateObj?: HassEntity,
  stateValue?: string,
  entry?: EntityRegistryEntry | EntityRegistryDisplayEntry
) => {
  const platform = entry?.platform;
  const translation_key = entry?.translation_key;
  const device_class = stateObj?.attributes.device_class;
  const state = stateValue ?? stateObj?.state;

  let icon: string | undefined;
  if (translation_key && platform) {
    const platformIcons = await getPlatformIcons(hass, platform);
    if (platformIcons) {
      const translations = platformIcons[domain]?.[translation_key];

      icon = getIconFromTranslations(state, translations);
    }
  }

  if (!icon && stateObj) {
    icon = stateIcon(stateObj, state);
  }

  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      const translations =
        (device_class && entityComponentIcons[device_class]) ||
        entityComponentIcons._;

      icon = getIconFromTranslations(state, translations);
    }
  }
  return icon;
};

export const attributeIcon = async (
  hass: HomeAssistant,
  state: HassEntity,
  attribute: string,
  attributeValue?: string
) => {
  let icon: string | undefined;
  const domain = computeStateDomain(state);
  const deviceClass = state.attributes.device_class;
  const entity = hass.entities?.[state.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;
  const platform = entity?.platform;
  const translation_key = entity?.translation_key;
  const value =
    attributeValue ??
    (state.attributes[attribute] as string | number | undefined);

  if (translation_key && platform) {
    const platformIcons = await getPlatformIcons(hass, platform);
    if (platformIcons) {
      icon = getIconFromTranslations(
        value,
        platformIcons[domain]?.[translation_key]?.state_attributes?.[attribute]
      );
    }
  }
  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      const translations =
        (deviceClass &&
          entityComponentIcons[deviceClass]?.state_attributes?.[attribute]) ||
        entityComponentIcons._?.state_attributes?.[attribute];

      icon = getIconFromTranslations(value, translations);
    }
  }
  return icon;
};

export const serviceIcon = async (
  hass: HomeAssistant,
  service: string
): Promise<string | undefined> => {
  let icon: string | undefined;
  const domain = computeDomain(service);
  const serviceName = computeObjectId(service);
  const serviceIcons = await getServiceIcons(hass, domain);
  if (serviceIcons) {
    const srvceIcon = serviceIcons[serviceName] as ServiceIcons[string];
    icon = srvceIcon?.service;
  }
  if (!icon) {
    icon = await domainIcon(hass, domain);
  }
  return icon;
};

export const serviceSectionIcon = async (
  hass: HomeAssistant,
  service: string,
  section: string
): Promise<string | undefined> => {
  const domain = computeDomain(service);
  const serviceName = computeObjectId(service);
  const serviceIcons = await getServiceIcons(hass, domain);
  if (serviceIcons) {
    const srvceIcon = serviceIcons[serviceName] as ServiceIcons[string];
    return srvceIcon?.sections?.[section];
  }
  return undefined;
};

export const domainIcon = async (
  hass: HomeAssistant,
  domain: string,
  deviceClass?: string
): Promise<string | undefined> => {
  const entityComponentIcons = await getComponentIcons(hass, domain);
  if (entityComponentIcons) {
    const translations =
      (deviceClass && entityComponentIcons[deviceClass]) ||
      entityComponentIcons._;
    return translations?.default;
  }
  return undefined;
};
