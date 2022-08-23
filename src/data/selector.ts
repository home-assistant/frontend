import type { HassEntity } from "home-assistant-js-websocket";
import { computeStateDomain } from "../common/entity/compute_state_domain";
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
  | DateSelector
  | DateTimeSelector
  | DeviceSelector
  | DurationSelector
  | EntitySelector
  | FileSelector
  | IconSelector
  | LocationSelector
  | MediaSelector
  | NumberSelector
  | ObjectSelector
  | SelectSelector
  | StateSelector
  | StringSelector
  | TargetSelector
  | TemplateSelector
  | ThemeSelector
  | TimeSelector;

export interface ActionSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  action: {};
}

export interface AddonSelector {
  addon: {
    name?: string;
    slug?: string;
  };
}

export interface SelectorDevice {
  integration?: DeviceSelector["device"]["integration"];
  manufacturer?: DeviceSelector["device"]["manufacturer"];
  model?: DeviceSelector["device"]["model"];
}

export interface SelectorEntity {
  integration?: EntitySelector["entity"]["integration"];
  domain?: EntitySelector["entity"]["domain"];
  device_class?: EntitySelector["entity"]["device_class"];
}

export interface AreaSelector {
  area: {
    entity?: SelectorEntity;
    device?: SelectorDevice;
    multiple?: boolean;
  };
}

export interface AttributeSelector {
  attribute: {
    entity_id?: string;
    hide_attributes?: readonly string[];
  };
}

export interface BooleanSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  boolean: {};
}

export interface ColorRGBSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  color_rgb: {};
}

export interface ColorTempSelector {
  color_temp: {
    min_mireds?: number;
    max_mireds?: number;
  };
}

export interface ConfigEntrySelector {
  config_entry: {
    integration?: string;
  };
}

export interface DateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  date: {};
}

export interface DateTimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  datetime: {};
}

export interface DeviceSelector {
  device: {
    integration?: string;
    manufacturer?: string;
    model?: string;
    entity?: SelectorEntity;
    multiple?: boolean;
  };
}

export interface DurationSelector {
  duration: {
    enable_day?: boolean;
  };
}

export interface EntitySelector {
  entity: {
    integration?: string;
    domain?: string | readonly string[];
    device_class?: string;
    multiple?: boolean;
    include_entities?: string[];
    exclude_entities?: string[];
  };
}

export interface FileSelector {
  file: {
    accept: string;
  };
}

export interface IconSelector {
  icon: {
    placeholder?: string;
    fallbackPath?: string;
  };
}

export interface LocationSelector {
  location: { radius?: boolean; icon?: string };
}

export interface LocationSelectorValue {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface MediaSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  media: {};
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

export interface NumberSelector {
  number: {
    min?: number;
    max?: number;
    step?: number;
    mode?: "box" | "slider";
    unit_of_measurement?: string;
  };
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {};
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectSelector {
  select: {
    multiple?: boolean;
    custom_value?: boolean;
    mode?: "list" | "dropdown";
    options: readonly string[] | readonly SelectOption[];
  };
}

export interface StateSelector {
  state: {
    entity_id?: string;
    attribute?: string;
  };
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
  };
}

export interface TargetSelector {
  target: {
    entity?: SelectorEntity;
    device?: SelectorDevice;
  };
}

export interface TemplateSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  template: {};
}

export interface ThemeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  theme: {};
}
export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {};
}

export const filterSelectorDevices = (
  filterDevice: SelectorDevice,
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
  filterEntity: SelectorEntity,
  entity: HassEntity,
  entitySources?: EntitySources
): boolean => {
  const {
    domain: filterDomain,
    device_class: filterDeviceClass,
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

  if (
    filterDeviceClass &&
    entity.attributes.device_class !== filterDeviceClass
  ) {
    return false;
  }

  if (
    filterIntegration &&
    entitySources?.[entity.entity_id]?.domain !== filterIntegration
  ) {
    return false;
  }

  return true;
};
