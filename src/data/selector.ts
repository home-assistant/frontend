import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import { UiAction } from "../panels/lovelace/components/hui-action-editor";
import { HomeAssistant } from "../types";
import {
  DeviceRegistryEntry,
  getDeviceIntegrationLookup,
} from "./device_registry";
import { EntityRegistryDisplayEntry } from "./entity_registry";
import { EntitySources } from "./entity_sources";

export type Selector =
  | ActionSelector
  | AddonSelector
  | AreaSelector
  | AttributeSelector
  | BooleanSelector
  | ColorRGBSelector
  | ColorTempSelector
  | ConditionSelector
  | ConversationAgentSelector
  | ConfigEntrySelector
  | ConstantSelector
  | CountrySelector
  | DateSelector
  | DateTimeSelector
  | DeviceSelector
  | LegacyDeviceSelector
  | DurationSelector
  | EntitySelector
  | LegacyEntitySelector
  | FileSelector
  | IconSelector
  | LanguageSelector
  | LocationSelector
  | MediaSelector
  | NavigationSelector
  | NumberSelector
  | ObjectSelector
  | AssistPipelineSelector
  | SelectSelector
  | StateSelector
  | StatisticSelector
  | StringSelector
  | STTSelector
  | TargetSelector
  | TemplateSelector
  | ThemeSelector
  | TimeSelector
  | TTSSelector
  | TTSVoiceSelector
  | UiActionSelector
  | UiColorSelector;

export interface ActionSelector {
  action: {
    reorder_mode?: boolean;
    nested?: boolean;
  } | null;
}

export interface AddonSelector {
  addon: {
    name?: string;
    slug?: string;
  } | null;
}

export interface AreaSelector {
  area: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    multiple?: boolean;
  } | null;
}

export interface AttributeSelector {
  attribute: {
    entity_id?: string;
    hide_attributes?: readonly string[];
  } | null;
}

export interface BooleanSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  boolean: {} | null;
}

export interface ColorRGBSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  color_rgb: {} | null;
}

export interface ColorTempSelector {
  color_temp: {
    min_mireds?: number;
    max_mireds?: number;
  } | null;
}

export interface ConditionSelector {
  condition: {
    reorder_mode?: boolean;
    nested?: boolean;
  } | null;
}

export interface ConversationAgentSelector {
  conversation_agent: { language?: string } | null;
}

export interface ConfigEntrySelector {
  config_entry: {
    integration?: string;
  } | null;
}

export interface ConstantSelector {
  constant: {
    value: string | number | boolean;
    label?: string;
    translation_key?: string;
  } | null;
}

export interface CountrySelector {
  country: {
    countries: string[];
    no_sort?: boolean;
  } | null;
}

export interface DateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  date: {} | null;
}

export interface DateTimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  datetime: {} | null;
}

interface DeviceSelectorFilter {
  integration?: string;
  manufacturer?: string;
  model?: string;
}

export interface DeviceSelector {
  device: {
    filter?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    multiple?: boolean;
  } | null;
}

export interface LegacyDeviceSelector {
  device: DeviceSelector["device"] & {
    /**
     * @deprecated Use filter instead
     */
    integration?: DeviceSelectorFilter["integration"];
    /**
     * @deprecated Use filter instead
     */
    manufacturer?: DeviceSelectorFilter["manufacturer"];
    /**
     * @deprecated Use filter instead
     */
    model?: DeviceSelectorFilter["model"];
  };
}

export interface DurationSelector {
  duration: {
    enable_day?: boolean;
  } | null;
}

interface EntitySelectorFilter {
  integration?: string;
  domain?: string | readonly string[];
  device_class?: string | readonly string[];
  supported_features?: number | [number];
}

export interface EntitySelector {
  entity: {
    multiple?: boolean;
    include_entities?: string[];
    exclude_entities?: string[];
    filter?: EntitySelectorFilter | readonly EntitySelectorFilter[];
  } | null;
}

export interface LegacyEntitySelector {
  entity: EntitySelector["entity"] & {
    /**
     * @deprecated Use filter instead
     */
    integration?: EntitySelectorFilter["integration"];
    /**
     * @deprecated Use filter instead
     */
    domain?: EntitySelectorFilter["domain"];
    /**
     * @deprecated Use filter instead
     */
    device_class?: EntitySelectorFilter["device_class"];
  };
}

export interface StatisticSelector {
  statistic: {
    device_class?: string;
    multiple?: boolean;
  };
}

export interface FileSelector {
  file: {
    accept: string;
  } | null;
}

export interface IconSelector {
  icon: {
    placeholder?: string;
    fallbackPath?: string;
  } | null;
}

export interface LanguageSelector {
  language: {
    languages?: string[];
    native_name?: boolean;
    no_sort?: boolean;
  } | null;
}

export interface LocationSelector {
  location: { radius?: boolean; icon?: string } | null;
}

export interface LocationSelectorValue {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface MediaSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  media: {} | null;
}

export interface MediaSelectorValue {
  entity_id?: string;
  media_content_id?: string;
  media_content_type?: string;
  metadata?: {
    title?: string;
    thumbnail?: string | null;
    media_class?: string;
    children_media_class?: string | null;
    navigateIds?: { media_content_type: string; media_content_id: string }[];
  };
}

export interface NavigationSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  navigation: {} | null;
}

export interface NumberSelector {
  number: {
    min?: number;
    max?: number;
    step?: number | "any";
    mode?: "box" | "slider";
    unit_of_measurement?: string;
  } | null;
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {} | null;
}

export interface AssistPipelineSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  assist_pipeline: {
    include_last_used?: boolean;
  } | null;
}

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

export interface SelectSelector {
  select: {
    multiple?: boolean;
    custom_value?: boolean;
    mode?: "list" | "dropdown";
    options: readonly string[] | readonly SelectOption[];
    translation_key?: string;
    sort?: boolean;
    reorder?: boolean;
  } | null;
}

export interface StateSelector {
  state: {
    extra_options?: { label: string; value: any }[];
    entity_id?: string;
    attribute?: string;
  } | null;
}

export interface BackupLocationSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  backup_location: {} | null;
}

export interface StringSelector {
  text: {
    multiline?: boolean;
    type?:
      | "number"
      | "text"
      | "search"
      | "tel"
      | "url"
      | "email"
      | "password"
      | "date"
      | "month"
      | "week"
      | "time"
      | "datetime-local"
      | "color";
    prefix?: string;
    suffix?: string;
    autocomplete?: string;
  } | null;
}

export interface STTSelector {
  stt: { language?: string } | null;
}

export interface TargetSelector {
  target: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
  } | null;
}

export interface TemplateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  template: {} | null;
}

export interface ThemeSelector {
  theme: { include_default?: boolean } | null;
}
export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {} | null;
}

export interface TTSSelector {
  tts: { language?: string } | null;
}

export interface TTSVoiceSelector {
  tts_voice: { engineId?: string; language?: string } | null;
}

export interface UiActionSelector {
  ui_action: {
    actions?: UiAction[];
  } | null;
}

export interface UiColorSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  ui_color: {} | null;
}

export const expandAreaTarget = (
  hass: HomeAssistant,
  areaId: string,
  devices: HomeAssistant["devices"],
  entities: HomeAssistant["entities"],
  targetSelector: TargetSelector,
  entitySources?: EntitySources
) => {
  const newEntities: string[] = [];
  const newDevices: string[] = [];
  Object.values(devices).forEach((device) => {
    if (
      device.area_id === areaId &&
      deviceMeetsTargetSelector(
        hass,
        Object.values(entities),
        device,
        targetSelector,
        entitySources
      )
    ) {
      newDevices.push(device.id);
    }
  });
  Object.values(entities).forEach((entity) => {
    if (
      entity.area_id === areaId &&
      entityMeetsTargetSelector(
        hass.states[entity.entity_id],
        targetSelector,
        entitySources
      )
    ) {
      newEntities.push(entity.entity_id);
    }
  });
  return { devices: newDevices, entities: newEntities };
};

export const expandDeviceTarget = (
  hass: HomeAssistant,
  deviceId: string,
  entities: HomeAssistant["entities"],
  targetSelector: TargetSelector,
  entitySources?: EntitySources
) => {
  const newEntities: string[] = [];
  Object.values(entities).forEach((entity) => {
    if (
      entity.device_id === deviceId &&
      entityMeetsTargetSelector(
        hass.states[entity.entity_id],
        targetSelector,
        entitySources
      )
    ) {
      newEntities.push(entity.entity_id);
    }
  });
  return { entities: newEntities };
};

const deviceMeetsTargetSelector = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryDisplayEntry[],
  device: DeviceRegistryEntry,
  targetSelector: TargetSelector,
  entitySources?: EntitySources
): boolean => {
  const deviceIntegrationLookup = entitySources
    ? getDeviceIntegrationLookup(entitySources, entityRegistry)
    : undefined;

  if (targetSelector.target?.device) {
    if (
      !ensureArray(targetSelector.target.device).some((filterDevice) =>
        filterSelectorDevices(filterDevice, device, deviceIntegrationLookup)
      )
    ) {
      return false;
    }
  }
  if (targetSelector.target?.entity) {
    const entities = entityRegistry.filter(
      (reg) => reg.device_id === device.id
    );
    return entities.some((entity) => {
      const entityState = hass.states[entity.entity_id];
      return entityMeetsTargetSelector(
        entityState,
        targetSelector,
        entitySources
      );
    });
  }
  return true;
};

const entityMeetsTargetSelector = (
  entity: HassEntity,
  targetSelector: TargetSelector,
  entitySources?: EntitySources
): boolean => {
  if (targetSelector.target?.entity) {
    return ensureArray(targetSelector.target!.entity).some((filterEntity) =>
      filterSelectorEntities(filterEntity, entity, entitySources)
    );
  }
  return true;
};

export const filterSelectorDevices = (
  filterDevice: DeviceSelectorFilter,
  device: DeviceRegistryEntry,
  deviceIntegrationLookup?: Record<string, string[]> | undefined
): boolean => {
  const {
    manufacturer: filterManufacturer,
    model: filterModel,
    integration: filterIntegration,
  } = filterDevice;

  if (filterManufacturer && device.manufacturer !== filterManufacturer) {
    return false;
  }

  if (filterModel && device.model !== filterModel) {
    return false;
  }

  if (filterIntegration && deviceIntegrationLookup) {
    if (!deviceIntegrationLookup?.[device.id]?.includes(filterIntegration)) {
      return false;
    }
  }
  return true;
};

export const filterSelectorEntities = (
  filterEntity: EntitySelectorFilter,
  entity: HassEntity,
  entitySources?: EntitySources
): boolean => {
  const {
    domain: filterDomain,
    device_class: filterDeviceClass,
    supported_features: filterSupportedFeature,
    integration: filterIntegration,
  } = filterEntity;

  if (filterDomain) {
    const entityDomain = computeStateDomain(entity);
    if (
      Array.isArray(filterDomain)
        ? !filterDomain.includes(entityDomain)
        : entityDomain !== filterDomain
    ) {
      return false;
    }
  }

  if (filterDeviceClass) {
    const entityDeviceClass = entity.attributes.device_class;
    if (
      entityDeviceClass && Array.isArray(filterDeviceClass)
        ? !filterDeviceClass.includes(entityDeviceClass)
        : entityDeviceClass !== filterDeviceClass
    ) {
      return false;
    }
  }

  if (filterSupportedFeature) {
    if (
      !ensureArray(filterSupportedFeature).some((feature) =>
        supportsFeature(entity, feature)
      )
    ) {
      return false;
    }
  }

  if (
    filterIntegration &&
    entitySources?.[entity.entity_id]?.domain !== filterIntegration
  ) {
    return false;
  }

  return true;
};

export const handleLegacyEntitySelector = (
  selector: LegacyEntitySelector | EntitySelector
): EntitySelector => {
  if (!selector.entity) return { entity: null };

  if ("filter" in selector.entity) return selector;

  const { domain, integration, device_class, ...rest } = (
    selector as LegacyEntitySelector
  ).entity!;

  if (domain || integration || device_class) {
    return {
      entity: {
        ...rest,
        filter: {
          domain,
          integration,
          device_class,
        },
      },
    };
  }
  return {
    entity: rest,
  };
};

export const handleLegacyDeviceSelector = (
  selector: LegacyDeviceSelector | DeviceSelector
): DeviceSelector => {
  if (!selector.device) return { device: null };

  if ("filter" in selector.device) return selector;

  const { integration, manufacturer, model, ...rest } = (
    selector as LegacyDeviceSelector
  ).device!;

  if (integration || manufacturer || model) {
    return {
      device: {
        ...rest,
        filter: {
          integration,
          manufacturer,
          model,
        },
      },
    };
  }
  return {
    device: rest,
  };
};
