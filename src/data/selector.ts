import type { HassEntity } from "home-assistant-js-websocket";
import { ensureArray } from "../common/array/ensure-array";
import { computeStateDomain } from "../common/entity/compute_state_domain";
import { supportsFeature } from "../common/entity/supports-feature";
import { UiAction } from "../panels/lovelace/components/hui-action-editor";
import type { DeviceRegistryEntry } from "./device_registry";
import type { EntitySources } from "./entity_sources";

export type Selector =
  | ActionSelector
  | AddonSelector
  | AreaSelector
  | AttributeSelector
  | BooleanSelector
  | ColorRGBSelector
  | ColorTempSelector
  | ConfigEntrySelector
  | ConstantSelector
  | DateSelector
  | DateTimeSelector
  | DeviceSelector
  | LegacyDeviceSelector
  | DurationSelector
  | EntitySelector
  | LegacyEntitySelector
  | FileSelector
  | IconSelector
  | LocationSelector
  | MediaSelector
  | NavigationSelector
  | NumberSelector
  | ObjectSelector
  | SelectSelector
  | StateSelector
  | StatisticSelector
  | StringSelector
  | TargetSelector
  | TemplateSelector
  | ThemeSelector
  | TimeSelector
  | UiActionSelector
  | UiColorSelector;

export interface ActionSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
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
  device:
    | DeviceSelector["device"] & {
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
  entity:
    | EntitySelector["entity"] & {
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
    step?: number;
    mode?: "box" | "slider";
    unit_of_measurement?: string;
  } | null;
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {} | null;
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
  } | null;
}

export interface StateSelector {
  state: {
    entity_id?: string;
    attribute?: string;
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
    suffix?: string;
    autocomplete?: string;
  } | null;
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  theme: {} | null;
}
export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {} | null;
}

export interface UiActionSelector {
  "ui-action": {
    actions?: UiAction[];
  } | null;
}

export interface UiColorSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  "ui-color": {} | null;
}

export const filterSelectorDevices = (
  filterDevice: DeviceSelectorFilter,
  device: DeviceRegistryEntry,
  deviceIntegrationLookup: Record<string, string[]> | undefined
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
      ensureArray(filterSupportedFeature).some(
        (feature) => !supportsFeature(entity, feature)
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
