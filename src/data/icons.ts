import { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { HomeAssistant } from "../types";

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
      state_attributes: Record<string, { state: Record<string, string> }>;
      default: string;
    };
  };
}

interface ComponentIcons {
  [device_class: string]: {
    state: Record<string, string>;
    state_attributes: Record<string, { state: Record<string, string> }>;
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
  let icon: string | undefined;
  const domain = computeStateDomain(state);
  const entity = hass.entities?.[state.entity_id];
  const value = stateValue ?? state.state;
  if (entity?.icon) {
    return entity.icon;
  }
  if (entity?.translation_key && entity.platform) {
    const platformIcons = await getPlatformIcons(hass, entity.platform);
    if (platformIcons) {
      icon =
        platformIcons[domain]?.[entity.translation_key]?.state?.[value] ||
        platformIcons[domain]?.[entity.translation_key]?.default;
    }
  }
  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      icon =
        entityComponentIcons[state.attributes.device_class || "_"]?.state?.[
          value
        ] ||
        entityComponentIcons._?.state?.[value] ||
        entityComponentIcons[state.attributes.device_class || "_"]?.default ||
        entityComponentIcons._?.default;
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
  const entity = hass.entities?.[state.entity_id];
  const value = attributeValue ?? state.attributes[attribute];
  if (entity?.translation_key && entity.platform) {
    const platformIcons = await getPlatformIcons(hass, entity.platform);
    if (platformIcons) {
      icon =
        platformIcons[domain]?.[entity.translation_key]?.state_attributes?.[
          attribute
        ]?.state?.[value];
    }
  }
  if (!icon) {
    const entityComponentIcons = await getComponentIcons(hass, domain);
    if (entityComponentIcons) {
      icon =
        entityComponentIcons[state.attributes.device_class || "_"]
          .state_attributes?.[attribute]?.state?.[value] ||
        entityComponentIcons._.state_attributes?.[attribute]?.state?.[value];
    }
  }
  return icon;
};
