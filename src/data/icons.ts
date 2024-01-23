import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { HomeAssistant } from "../types";
import {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";
import { computeDomain } from "../common/entity/compute_domain";

const resources: Record<IconCategory, any> = {
  entity: {},
  entity_component: undefined,
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

export type IconCategory = "entity" | "entity_component";

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
  if (!force && integration && integration in resources.entity) {
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

export const entityIcon = async (
  hass: HomeAssistant,
  state: HassEntity,
  stateValue?: string
) => {
  const entity = hass.entities?.[state.entity_id] as
    | EntityRegistryDisplayEntry
    | undefined;

  if (entity?.icon) {
    return entity.icon;
  }
  const domain = computeStateDomain(state);
  const deviceClass = state.attributes.device_class;

  return getEntityIcon(
    hass,
    domain,
    deviceClass,
    stateValue ?? state.state,
    entity?.platform,
    entity?.translation_key
  );
};

export const entryIcon = async (
  hass: HomeAssistant,
  entry: EntityRegistryEntry | EntityRegistryDisplayEntry
) => {
  if (entry.icon) {
    return entry.icon;
  }
  const domain = computeDomain(entry.entity_id);
  return getEntityIcon(
    hass,
    domain,
    undefined,
    undefined,
    entry.platform,
    entry.translation_key
  );
};

const getEntityIcon = async (
  hass: HomeAssistant,
  domain: string,
  deviceClass?: string,
  value?: string,
  platform?: string,
  translation_key?: string
) => {
  let icon: string | undefined;
  if (translation_key && platform) {
    const platformIcons = await getPlatformIcons(hass, platform);
    if (platformIcons) {
      const translations = platformIcons[domain]?.[translation_key];
      icon = (value && translations?.state?.[value]) || translations?.default;
    }
  }
  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      const translations = entityComponentIcons[deviceClass || "_"];
      icon = (value && translations?.state?.[value]) || translations?.default;
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
        entityComponentIcons[deviceClass || "_"].state_attributes?.[attribute];
      icon = (value && translations?.state?.[value]) || translations?.default;
    }
  }
  return icon;
};
