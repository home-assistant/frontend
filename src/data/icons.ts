import { HassEntity } from "home-assistant-js-websocket";
import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { stateIcon } from "../common/entity/state_icon";
import { HomeAssistant } from "../types";
import {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";

const resources: Record<IconCategory, any> = {
  entity: {},
  entity_component: undefined,
  services: {},
};

interface IconResources {
  resources: Record<string, string | Record<string, string>>;
}

interface PlatformIcons {
  [domain: string]: {
    [translation_key: string]: {
      state: Record<string, string>;
      state_attributes: Record<
        string,
        {
          state: Record<string, string>;
          default: string;
        }
      >;
      default: string;
    };
  };
}

interface ComponentIcons {
  [device_class: string]: {
    state: Record<string, string>;
    state_attributes: Record<
      string,
      {
        state: Record<string, string>;
        default: string;
      }
    >;
    default: string;
  };
}

interface ServiceIcons {
  [service: string]: string;
}

export type IconCategory = "entity" | "entity_component" | "services";

export const getHassIcons = async (
  hass: HomeAssistant,
  category: IconCategory,
  integration?: string
): Promise<IconResources> =>
  hass.callWS<{ resources: Record<string, string> }>({
    type: "frontend/get_icons",
    category,
    integration,
  });

export const getPlatformIcons = async (
  hass: HomeAssistant,
  integration: string,
  force = false
): Promise<PlatformIcons> => {
  if (!force && integration in resources.entity) {
    return resources.entity[integration];
  }
  const result = getHassIcons(hass, "entity", integration);
  resources.entity[integration] = result.then(
    (res) => res?.resources[integration]
  );
  return resources.entity[integration];
};

export const getComponentIcons = async (
  hass: HomeAssistant,
  domain: string,
  force = false
): Promise<ComponentIcons> => {
  if (!force && resources.entity_component) {
    return resources.entity_component.then((res) => res[domain]);
  }
  resources.entity_component = getHassIcons(hass, "entity_component").then(
    (result) => result.resources
  );
  return resources.entity_component.then((res) => res[domain]);
};

export const getServiceIcons = async (
  hass: HomeAssistant,
  domain?: string,
  force = false
): Promise<ServiceIcons> => {
  if (!domain) {
    if (!force && resources.services.all) {
      return resources.services.all;
    }
    resources.services.all = getHassIcons(hass, "services", domain).then(
      (res) => {
        resources.services = res.resources;
        return res?.resources;
      }
    );
    return resources.services.all;
  }
  if (!force && domain && domain in resources.services) {
    return resources.services[domain];
  }
  if (resources.services.all && !force) {
    await resources.services.all;
    if (domain in resources.services) {
      return resources.services[domain];
    }
  }
  const result = getHassIcons(hass, "services", domain);
  resources.services[domain] = result.then((res) => res?.resources[domain]);
  return resources.services[domain];
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
  const domain = computeDomain(entry.entity_id);
  return getEntityIcon(hass, domain, undefined, undefined, entry);
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
      icon = (state && translations?.state?.[state]) || translations?.default;
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
      icon = (state && translations?.state?.[state]) || translations?.default;
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
      const translations =
        platformIcons[domain]?.[translation_key]?.state_attributes?.[attribute];
      icon = (value && translations?.state?.[value]) || translations?.default;
    }
  }
  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      const translations =
        (deviceClass &&
          entityComponentIcons[deviceClass]?.state_attributes?.[attribute]) ||
        entityComponentIcons._?.state_attributes?.[attribute];
      icon = (value && translations?.state?.[value]) || translations?.default;
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
    icon = serviceIcons[serviceName];
  }
  if (!icon) {
    icon = await domainIcon(hass, domain);
  }
  return icon;
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
