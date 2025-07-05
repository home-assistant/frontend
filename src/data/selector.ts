import type {
  HassEntity,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import type { CropOptions } from "../dialogs/image-cropper-dialog/show-image-cropper-dialog";
import { isHelperDomain } from "../panels/config/helpers/const";
import type { UiAction } from "../panels/lovelace/components/hui-action-editor";
import type { HomeAssistant } from "../types";
import {
  type DeviceRegistryEntry,
  getDeviceIntegrationLookup,
} from "./device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity_registry";
import type { EntitySources } from "./entity_sources";

export type Selector =
  | ActionSelector
  | AddonSelector
  | AreaSelector
  | AreasDisplaySelector
  | AttributeSelector
  | BooleanSelector
  | ButtonToggleSelector
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
  | FloorSelector
  | LegacyDeviceSelector
  | DurationSelector
  | EntitySelector
  | LegacyEntitySelector
  | FileSelector
  | IconSelector
  | LabelSelector
  | ImageSelector
  | BackgroundSelector
  | LanguageSelector
  | LocationSelector
  | MediaSelector
  | NavigationSelector
  | NumberSelector
  | ObjectSelector
  | AssistPipelineSelector
  | QRCodeSelector
  | SelectSelector
  | SelectorSelector
  | StateSelector
  | StatisticSelector
  | StringSelector
  | STTSelector
  | TargetSelector
  | TemplateSelector
  | ThemeSelector
  | TimeSelector
  | TriggerSelector
  | TTSSelector
  | TTSVoiceSelector
  | UiActionSelector
  | UiColorSelector
  | UiStateContentSelector
  | BackupLocationSelector;

export interface ActionSelector {
  action: {} | null;
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

export interface AreasDisplaySelector {
  areas_display: {} | null;
}

export interface AttributeSelector {
  attribute: {
    entity_id?: string;
    hide_attributes?: readonly string[];
  } | null;
}

export interface BooleanSelector {
  boolean: {} | null;
}

export interface ButtonToggleSelector {
  button_toggle: {
    options: readonly string[] | readonly SelectOption[];
    translation_key?: string;
    sort?: boolean;
  } | null;
}

export interface ColorRGBSelector {
  color_rgb: {} | null;
}

export interface ColorTempSelector {
  color_temp: {
    unit?: "kelvin" | "mired";
    min?: number;
    max?: number;
    min_mireds?: number;
    max_mireds?: number;
  } | null;
}

export interface ConditionSelector {
  condition: {} | null;
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
  date: {} | null;
}

export interface DateTimeSelector {
  datetime: {} | null;
}

interface DeviceSelectorFilter {
  integration?: string;
  manufacturer?: string;
  model?: string;
  model_id?: string;
}

export interface DeviceSelector {
  device: {
    filter?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    multiple?: boolean;
  } | null;
}

export interface FloorSelector {
  floor: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
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
    enable_millisecond?: boolean;
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

export interface ImageSelector {
  image: { original?: boolean; crop?: CropOptions } | null;
}

export interface BackgroundSelector {
  background: { original?: boolean; crop?: CropOptions } | null;
}

export interface LabelSelector {
  label: {
    multiple?: boolean;
  };
}

export interface LanguageSelector {
  language: {
    languages?: string[];
    native_name?: boolean;
    no_sort?: boolean;
  } | null;
}

export interface LocationSelector {
  location: {
    radius?: boolean;
    radius_readonly?: boolean;
    icon?: string;
  } | null;
}

export interface LocationSelectorValue {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface MediaSelector {
  media: {
    accept?: string[];
  } | null;
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
  navigation: {} | null;
}

export interface NumberSelector {
  number: {
    min?: number;
    max?: number;
    step?: number | "any";
    mode?: "box" | "slider";
    unit_of_measurement?: string;
    slider_ticks?: boolean;
    translation_key?: string;
  } | null;
}

interface ObjectSelectorField {
  selector: Selector;
  label?: string;
  required?: boolean;
}

export interface ObjectSelector {
  object?: {
    label_field?: string;
    description_field?: string;
    translation_key?: string;
    fields?: Record<string, ObjectSelectorField>;
    multiple?: boolean;
  } | null;
}

export interface AssistPipelineSelector {
  assist_pipeline: {
    include_last_used?: boolean;
  } | null;
}

interface SelectBoxOptionImage {
  src: string;
  src_dark?: string;
  flip_rtl?: boolean;
}

export interface SelectOption {
  value: any;
  label: string;
  description?: string;
  image?: string | SelectBoxOptionImage;
  disabled?: boolean;
}

export interface SelectSelector {
  select: {
    multiple?: boolean;
    custom_value?: boolean;
    mode?: "list" | "dropdown" | "box";
    options: readonly string[] | readonly SelectOption[];
    translation_key?: string;
    sort?: boolean;
    reorder?: boolean;
    box_max_columns?: number;
  } | null;
}

export interface SelectorSelector {
  selector: {} | null;
}

export interface StateSelector {
  state: {
    extra_options?: { label: string; value: any }[];
    entity_id?: string;
    attribute?: string;
  } | null;
}

export interface BackupLocationSelector {
  backup_location: {} | null;
}

export interface QRCodeSelector {
  qr_code: {
    data: string;
    scale?: number;
    error_correction_level?: "low" | "medium" | "quartile" | "high";
    center_image?: string;
  } | null;
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
    multiple?: true;
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
  template: {} | null;
}

export interface ThemeSelector {
  theme: { include_default?: boolean } | null;
}
export interface TimeSelector {
  time: { no_second?: boolean } | null;
}

export interface TriggerSelector {
  trigger: {} | null;
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
    default_action?: UiAction;
  } | null;
}

export interface UiColorSelector {
  ui_color: {
    default_color?: string;
    include_none?: boolean;
    include_state?: boolean;
  } | null;
}

export interface UiStateContentSelector {
  ui_state_content: {
    entity_id?: string;
    allow_name?: boolean;
  } | null;
}

export const expandLabelTarget = (
  hass: HomeAssistant,
  labelId: string,
  areas: HomeAssistant["areas"],
  devices: HomeAssistant["devices"],
  entities: HomeAssistant["entities"],
  targetSelector: TargetSelector,
  entitySources?: EntitySources
) => {
  const newEntities: string[] = [];
  const newDevices: string[] = [];
  const newAreas: string[] = [];

  Object.values(areas).forEach((area) => {
    if (
      area.labels.includes(labelId) &&
      areaMeetsTargetSelector(
        hass,
        entities,
        devices,
        area.area_id,
        targetSelector,
        entitySources
      )
    ) {
      newAreas.push(area.area_id);
    }
  });

  Object.values(devices).forEach((device) => {
    if (
      device.labels.includes(labelId) &&
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
      entity.labels.includes(labelId) &&
      entityMeetsTargetSelector(
        hass.states[entity.entity_id],
        targetSelector,
        entitySources
      )
    ) {
      newEntities.push(entity.entity_id);
    }
  });

  return { areas: newAreas, devices: newDevices, entities: newEntities };
};

export const expandFloorTarget = (
  hass: HomeAssistant,
  floorId: string,
  areas: HomeAssistant["areas"],
  targetSelector: TargetSelector,
  entitySources?: EntitySources
) => {
  const newAreas: string[] = [];
  Object.values(areas).forEach((area) => {
    if (
      area.floor_id === floorId &&
      areaMeetsTargetSelector(
        hass,
        hass.entities,
        hass.devices,
        area.area_id,
        targetSelector,
        entitySources
      )
    ) {
      newAreas.push(area.area_id);
    }
  });
  return { areas: newAreas };
};

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

export const areaMeetsTargetSelector = (
  hass: HomeAssistant,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areaId: string,
  targetSelector: TargetSelector,
  entitySources?: EntitySources
): boolean => {
  const hasMatchingdevice = Object.values(devices).some((device) => {
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
      return true;
    }
    return false;
  });
  if (hasMatchingdevice) {
    return true;
  }
  return Object.values(entities).some((entity) => {
    if (
      entity.area_id === areaId &&
      entityMeetsTargetSelector(
        hass.states[entity.entity_id],
        targetSelector,
        entitySources
      )
    ) {
      return true;
    }
    return false;
  });
};

export const deviceMeetsTargetSelector = (
  hass: HomeAssistant,
  entityRegistry: EntityRegistryDisplayEntry[] | EntityRegistryEntry[],
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

export const entityMeetsTargetSelector = (
  entity: HassEntity | undefined,
  targetSelector: TargetSelector,
  entitySources?: EntitySources
): boolean => {
  if (!entity) {
    return false;
  }
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
  deviceIntegrationLookup?: Record<string, Set<string>> | undefined
): boolean => {
  const {
    manufacturer: filterManufacturer,
    model: filterModel,
    model_id: filterModelId,
    integration: filterIntegration,
  } = filterDevice;

  if (filterManufacturer && device.manufacturer !== filterManufacturer) {
    return false;
  }

  if (filterModel && device.model !== filterModel) {
    return false;
  }

  if (filterModelId && device.model_id !== filterModelId) {
    return false;
  }

  if (filterIntegration && deviceIntegrationLookup) {
    if (!deviceIntegrationLookup?.[device.id]?.has(filterIntegration)) {
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

export const computeCreateDomains = (
  selector: EntitySelector | TargetSelector
): undefined | string[] => {
  let entityFilters: EntitySelectorFilter[] | undefined;

  if ("target" in selector) {
    entityFilters = ensureArray(selector.target?.entity);
  } else if ("entity" in selector) {
    if (selector.entity?.include_entities) {
      return undefined;
    }
    entityFilters = ensureArray(selector.entity?.filter);
  }
  if (!entityFilters) {
    return undefined;
  }

  const createDomains = entityFilters.flatMap((entityFilter) =>
    !entityFilter.integration &&
    !entityFilter.device_class &&
    !entityFilter.supported_features &&
    entityFilter.domain
      ? ensureArray(entityFilter.domain).filter((domain) =>
          isHelperDomain(domain)
        )
      : []
  );

  return [...new Set(createDomains)];
};

export const resolveEntityIDs = (
  hass: HomeAssistant,
  targetPickerValue: HassServiceTarget,
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  areas: HomeAssistant["areas"]
): string[] => {
  if (!targetPickerValue) {
    return [];
  }

  const targetSelector = { target: {} };
  const targetEntities = new Set(ensureArray(targetPickerValue.entity_id));
  const targetDevices = new Set(ensureArray(targetPickerValue.device_id));
  const targetAreas = new Set(ensureArray(targetPickerValue.area_id));
  const targetFloors = new Set(ensureArray(targetPickerValue.floor_id));
  const targetLabels = new Set(ensureArray(targetPickerValue.label_id));

  targetLabels.forEach((labelId) => {
    const expanded = expandLabelTarget(
      hass,
      labelId,
      areas,
      devices,
      entities,
      targetSelector
    );
    expanded.devices.forEach((id) => targetDevices.add(id));
    expanded.entities.forEach((id) => targetEntities.add(id));
    expanded.areas.forEach((id) => targetAreas.add(id));
  });

  targetFloors.forEach((floorId) => {
    const expanded = expandFloorTarget(hass, floorId, areas, targetSelector);
    expanded.areas.forEach((id) => targetAreas.add(id));
  });

  targetAreas.forEach((areaId) => {
    const expanded = expandAreaTarget(
      hass,
      areaId,
      devices,
      entities,
      targetSelector
    );
    expanded.devices.forEach((id) => targetDevices.add(id));
    expanded.entities.forEach((id) => targetEntities.add(id));
  });

  targetDevices.forEach((deviceId) => {
    const expanded = expandDeviceTarget(
      hass,
      deviceId,
      entities,
      targetSelector
    );
    expanded.entities.forEach((id) => targetEntities.add(id));
  });

  return Array.from(targetEntities);
};
