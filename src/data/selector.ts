import type {
  HassEntity,
  HassServiceTarget,
} from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import type { EntityNameItem } from "../common/entity/compute_entity_name_display";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import { isHelperDomain } from "../panels/config/helpers/const";
import type {
  ActionRelatedContext,
  UiAction,
} from "../panels/lovelace/components/hui-action-editor";
import type { HomeAssistant } from "../types";
import {
  type DeviceRegistryEntry,
  devicesInEffectiveArea,
  getDeviceIntegrationLookup,
} from "./device/device_registry";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "./entity/entity_registry";
import type { EntitySources } from "./entity/entity_sources";

export type ThresholdMode = "crossed" | "changed" | "is";

export type Selector =
  | ActionSelector
  | AddonSelector
  | AppSelector
  | AreaSelector
  | AreasDisplaySelector
  | AttributeSelector
  | AutomationBehaviorSelector
  | BooleanSelector
  | ButtonToggleSelector
  | ChooseSelector
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
  | DeviceClassSelector
  | DurationSelector
  | EntitySelector
  | EntityNameSelector
  | LegacyEntitySelector
  | FileSelector
  | IconSelector
  | LabelSelector
  | LanguageSelector
  | LocationSelector
  | MediaSelector
  | NavigationSelector
  | NumberSelector
  | NumericThresholdSelector
  | ObjectSelector
  | PeriodSelector
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
  | TimezoneSelector
  | TriggerSelector
  | TTSSelector
  | TTSVoiceSelector
  | SerialPortSelector
  | UiActionSelector
  | UiClockDateFormatSelector
  | UiColorSelector
  | UiStateContentSelector
  | UiTimeFormatSelector
  | BackupLocationSelector;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type SelectorType = KeysOfUnion<Selector>;

type UnionMemberWithKey<U, K extends PropertyKey> = U extends unknown
  ? K extends keyof U
    ? U
    : never
  : never;

export type SelectorForType<T extends SelectorType> = UnionMemberWithKey<
  Selector,
  T
>;

export interface ActionSelector {
  action: {
    optionsInSidebar?: boolean;
  } | null;
}

export interface AddonSelector {
  addon: AppSelector["app"];
}

export interface AppSelector {
  app: {
    name?: string;
    slug?: string;
  } | null;
}

export interface AreaSelector {
  area: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    multiple?: boolean;
    reorder?: boolean;
  } | null;
}

export interface AreasDisplaySelector {
  areas_display: {} | null;
}

export interface AttributeSelector {
  attribute: {
    entity_id?: string | string[];
    hide_attributes?: readonly string[];
  } | null;
}

export interface BooleanSelector {
  boolean: {} | null;
}

export type AutomationBehaviorTriggerMode = "first" | "all" | "each";

export type AutomationBehaviorConditionMode = "all" | "any";

export type AutomationBehavior =
  AutomationBehaviorTriggerMode | AutomationBehaviorConditionMode;

export interface AutomationBehaviorSelector {
  automation_behavior: {
    mode: "trigger" | "condition";
    translation_key?: string;
  } | null;
}

export interface ButtonToggleSelector {
  button_toggle: {
    options: readonly string[] | readonly SelectOption[];
    translation_key?: string;
    sort?: boolean;
  } | null;
}

export interface ChooseSelector {
  choose: {
    choices: Record<string, { selector: Selector }>;
    translation_key?: string;
  };
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
  condition: {
    optionsInSidebar?: boolean;
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
    allow_negative?: boolean;
    enable_second?: boolean;
  } | null;
}

interface EntitySelectorFilter {
  integration?: string;
  domain?: string | readonly string[];
  device_class?: string | readonly string[];
  supported_features?: number | [number];
  unit_of_measurement?: string | readonly string[];
}

interface EntitySelectorEntityFilter extends EntitySelectorFilter {
  device?: DeviceSelectorFilter;
}

export interface EntitySelectorExtraOption {
  id: string;
  primary: string;
  secondary?: string;
  icon?: string;
  icon_path?: string;
  entity_id?: string;
  hide_clear?: boolean;
}

export interface EntitySelector {
  entity: {
    multiple?: boolean;
    include_entities?: string[];
    exclude_entities?: string[];
    filter?: EntitySelectorEntityFilter | readonly EntitySelectorEntityFilter[];
    reorder?: boolean;
    extra_options?: EntitySelectorExtraOption[];
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

export interface TimezoneSelector {
  timezone: {} | null;
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
    image_upload?: boolean;
    hide_content_type?: boolean;
    content_id_helper?: string;
    multiple?: boolean;
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
    browse_entity_id?: string;
  };
}

export interface NavigationSelector {
  navigation: ActionRelatedContext | null;
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
    // Shown instead of the browser's native message when the value fails
    // min/max/step constraint validation.
    validation_message?: string;
  } | null;
}

export interface NumericThresholdSelector {
  numeric_threshold: {
    mode?: ThresholdMode;
    unit_of_measurement?: readonly string[];
    number?: NumberSelector["number"];
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
  } | null;
}

interface ObjectSelectorField {
  selector: Selector;
  label?: string;
  description?: string;
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

export type PeriodKey =
  | "today"
  | "yesterday"
  | "tomorrow"
  | "this_week"
  | "last_week"
  | "next_week"
  | "this_month"
  | "last_month"
  | "next_month"
  | "this_year"
  | "last_year"
  | "next_7d"
  | "next_30d"
  | "none";
export interface PeriodSelector {
  period: {
    options: readonly PeriodKey[];
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
  value: string;
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

export interface DeviceClassSelector {
  device_class: {
    domain: string;
    multiple?: boolean;
  } | null;
}

export interface SelectorSelector {
  selector: {} | null;
}

export interface SerialPortSelector {
  serial_port: {
    extra_recommended_domains?: string[];
  } | null;
}

export interface StateSelector {
  state: {
    extra_options?: { label: string; value: any }[];
    entity_id?: string | string[];
    attribute?: string;
    hide_states?: string[];
    multiple?: boolean;
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
    placeholder?: string;
    autocomplete?: string;
    multiple?: true;
    // Regular expression the value must match (HTML `pattern`); with `multiple`
    // every entry is validated. `validation_message` is shown when it fails.
    pattern?: string;
    validation_message?: string;
  } | null;
}

export interface STTSelector {
  stt: { language?: string } | null;
}

export interface TargetSelector {
  target: {
    entity?: EntitySelectorFilter | readonly EntitySelectorFilter[];
    device?: DeviceSelectorFilter | readonly DeviceSelectorFilter[];
    primary_entities_only?: boolean;
  } | null;
}

export interface TemplateSelector {
  template: {
    preview?: boolean;
  } | null;
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

export interface UiClockDateFormatSelector {
  ui_clock_date_format: {} | null;
}

export interface UiColorExtraOption {
  value: string;
  label: string;
  icon?: string;
  display_color?: string;
}

export interface UiColorSelector {
  ui_color: {
    default_color?: string;
    include_none?: boolean;
    include_state?: boolean;
    extra_options?: UiColorExtraOption[];
  } | null;
}

export interface UiStateContentSelector {
  ui_state_content: {
    entity_id?: string;
    allow_name?: boolean;
    allow_context?: boolean;
  } | null;
}

export interface UiTimeFormatSelector {
  ui_time_format: {} | null;
}

export interface EntityNameSelector {
  entity_name: {
    entity_id?: string;
    default_name?: EntityNameItem | EntityNameItem[] | string;
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
        hass.states,
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
        entitySources,
        hass.entities,
        hass.devices
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
  // Devices of an area are its effective-area members: a child device inheriting
  // this area counts, a child with a different explicit area does not.
  devicesInEffectiveArea(devices, areaId).forEach((device) => {
    if (
      deviceMeetsTargetSelector(
        hass.states,
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
        entitySources,
        hass.entities,
        hass.devices
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
        entitySources,
        hass.entities,
        hass.devices
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
  const hasMatchingdevice = devicesInEffectiveArea(devices, areaId).some(
    (device) =>
      deviceMeetsTargetSelector(
        hass.states,
        Object.values(entities),
        device,
        targetSelector,
        entitySources
      )
  );
  if (hasMatchingdevice) {
    return true;
  }
  return Object.values(entities).some((entity) => {
    if (
      entity.area_id === areaId &&
      entityMeetsTargetSelector(
        hass.states[entity.entity_id],
        targetSelector,
        entitySources,
        hass.entities,
        hass.devices
      )
    ) {
      return true;
    }
    return false;
  });
};

export const deviceMeetsTargetSelector = (
  states: HomeAssistant["states"],
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
    // Only the device's own entities: a child device is reached through the
    // device target itself, so a parent must not match on a child's behalf.
    const entities = entityRegistry.filter(
      (reg) => reg.device_id === device.id
    );
    return entities.some((entity) => {
      const entityState = states[entity.entity_id];
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
  entitySources?: EntitySources,
  entities?: HomeAssistant["entities"],
  devices?: HomeAssistant["devices"]
): boolean => {
  if (!entity) {
    return false;
  }
  if (targetSelector.target?.entity) {
    return ensureArray(targetSelector.target!.entity).some((filterEntity) =>
      filterSelectorEntities(
        filterEntity,
        entity,
        entitySources,
        entities,
        devices
      )
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
  filterEntity: EntitySelectorEntityFilter,
  entity: HassEntity,
  entitySources?: EntitySources,
  entityRegistry?: HomeAssistant["entities"],
  devices?: HomeAssistant["devices"],
  deviceIntegrationLookup?: Record<string, Set<string>>
): boolean => {
  const {
    domain: filterDomain,
    device_class: filterDeviceClass,
    supported_features: filterSupportedFeature,
    unit_of_measurement: filterUnitOfMeasurement,
    integration: filterIntegration,
    device: filterDevice,
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

  if (filterUnitOfMeasurement) {
    const entityUnitOfMeasurement = entity.attributes.unit_of_measurement;
    if (
      !entityUnitOfMeasurement ||
      (Array.isArray(filterUnitOfMeasurement)
        ? !filterUnitOfMeasurement.includes(entityUnitOfMeasurement)
        : entityUnitOfMeasurement !== filterUnitOfMeasurement)
    ) {
      return false;
    }
  }

  if (filterDevice) {
    if (!entityRegistry || !devices) {
      return false;
    }

    const deviceId = entityRegistry[entity.entity_id]?.device_id;
    if (!deviceId) {
      return false;
    }
    const device = devices[deviceId];
    if (!device) {
      return false;
    }
    if (!filterSelectorDevices(filterDevice, device, deviceIntegrationLookup)) {
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
  let entityFilters: EntitySelectorEntityFilter[] | undefined;

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
    !entityFilter.device &&
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
  areas: HomeAssistant["areas"],
  targetSelector: TargetSelector = { target: {} }
): string[] => {
  if (!targetPickerValue) {
    return [];
  }

  const targetEntities = new Set(ensureArray(targetPickerValue.entity_id));
  const targetDevices = new Set(ensureArray(targetPickerValue.device_id));
  const targetAreas = new Set(ensureArray(targetPickerValue.area_id));
  const targetFloors = new Set(ensureArray(targetPickerValue.floor_id));
  const targetLabels = new Set(ensureArray(targetPickerValue.label_id));

  // Only a directly targeted device pulls in its child devices. Devices that are
  // only reached through a label or an area must not, because core does not
  // inherit labels to children and resolves areas by effective area membership.
  const directDevices = new Set(targetDevices);

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

  // Devices only reached through an area do not pull in entities that are
  // explicitly assigned to another area, matching core.
  const devicesNotViaArea = new Set(targetDevices);

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

  // Targeting a device also targets its child devices, matching core's
  // server-side target resolution. Only direct device targets expand this way;
  // nesting is single-level, so one pass is enough.
  Object.values(devices).forEach((device) => {
    if (device.parent_device_id && directDevices.has(device.parent_device_id)) {
      targetDevices.add(device.id);
      devicesNotViaArea.add(device.id);
    }
  });

  targetDevices.forEach((deviceId) => {
    const expanded = expandDeviceTarget(
      hass,
      deviceId,
      entities,
      targetSelector
    );
    expanded.entities.forEach((id) => {
      if (devicesNotViaArea.has(deviceId) || !entities[id]?.area_id) {
        targetEntities.add(id);
      }
    });
  });

  return Array.from(targetEntities);
};
