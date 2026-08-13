import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import type { LocalizeFunc } from "../../common/translations/localize";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { computeRTL } from "../../common/util/compute_rtl";
import type { HaDevicePickerDeviceFilterFunc } from "../../components/device/ha-device-picker";
import type { PickerComboBoxItem } from "../../components/ha-picker-combo-box";
import type { FuseWeightedKey } from "../../resources/fuseMultiTerm";
import type { HomeAssistant } from "../../types";
import type { ConfigEntry } from "../config_entries";
import type { HaEntityPickerEntityFilterFunc } from "../entity/entity";
import type {
  EntityRegistryDisplayEntry,
  EntityRegistryEntry,
} from "../entity/entity_registry";
import { domainToName } from "../integration";
import {
  getDeviceEntityDisplayLookup,
  type DeviceEntityDisplayLookup,
  type DeviceRegistryEntry,
} from "./device_registry";

export interface DevicePickerItem extends PickerComboBoxItem {
  domain?: string;
  domain_name?: string;
  // Set when this device is a child rendered indented under its parent.
  is_child?: boolean;
  // Set on the last child of a parent so the tree connector draws its end.
  last?: boolean;
}

export interface DeviceAreaLabel {
  areaName?: string;
  viaDeviceName?: string;
  viaDeviceAreaName?: string;
  parentDeviceName?: string;
}

export interface GetDevicesOptions {
  includeDomains?: string[];
  excludeDomains?: string[];
  includeDeviceClasses?: string[];
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  excludeDevices?: string[];
  value?: string;
  idPrefix?: string;
  // When set, order the result so children directly follow their parent and
  // flag them for indented rendering. Requires the picker to disable its own
  // sorting (no-sort) so this order is preserved.
  nested?: boolean;
}

export const computeDeviceAreaLabel = (
  device: DeviceRegistryEntry,
  areas: HomeAssistant["areas"],
  devices: HomeAssistant["devices"],
  states: HomeAssistant["states"],
  localize: LocalizeFunc,
  language: HomeAssistant["language"],
  translationMetadata: HomeAssistant["translationMetadata"],
  viaDeviceEntities?: EntityRegistryEntry[] | EntityRegistryDisplayEntry[]
): DeviceAreaLabel => {
  // Pass devices so a child device inherits its parent's area.
  const area = getDeviceArea(device, areas, devices);

  const viaDevice = device.via_device_id
    ? devices[device.via_device_id]
    : undefined;
  const viaDeviceName = viaDevice
    ? computeDeviceNameDisplay(viaDevice, localize, states, viaDeviceEntities)
    : undefined;
  const viaDeviceArea = viaDevice
    ? getDeviceArea(viaDevice, areas, devices)
    : undefined;
  const viaDeviceAreaName = viaDeviceArea
    ? computeAreaName(viaDeviceArea)
    : undefined;

  // A child device is a logical part of its parent. We surface the parent name
  // only as a search term (below) — not in the area label, which stays the pure
  // (inherited) area. The nested tree rendering communicates the relationship.
  const parentDevice = device.parent_device_id
    ? devices[device.parent_device_id]
    : undefined;
  const parentDeviceName = parentDevice
    ? computeDeviceNameDisplay(parentDevice, localize, states)
    : undefined;

  const isRTL = computeRTL(language, translationMetadata.translations);

  const areaName = area
    ? computeAreaName(area)
    : viaDeviceAreaName
      ? `${viaDeviceAreaName}${isRTL ? " ◂ " : " ▸ "}${viaDeviceName}`
      : viaDeviceName || undefined;

  return { areaName, viaDeviceName, viaDeviceAreaName, parentDeviceName };
};

export const deviceComboBoxKeys: FuseWeightedKey[] = [
  {
    name: "search_labels.deviceName",
    weight: 10,
  },
  {
    name: "search_labels.areaName",
    weight: 8,
  },
  {
    name: "search_labels.domainName",
    weight: 4,
  },
  {
    name: "search_labels.domain",
    weight: 4,
  },
  {
    name: "search_labels.viaDeviceName",
    weight: 3,
  },
  {
    name: "search_labels.viaDeviceArea",
    weight: 3,
  },
  {
    name: "search_labels.parentDeviceName",
    weight: 3,
  },
  {
    name: "search_labels.childDeviceNames",
    weight: 3,
  },
];

export const getDevices = (
  hass: HomeAssistant,
  configEntryLookup: Record<string, ConfigEntry>,
  options?: GetDevicesOptions
): DevicePickerItem[] => {
  const {
    includeDomains,
    excludeDomains,
    includeDeviceClasses,
    deviceFilter,
    entityFilter,
    excludeDevices,
    value,
    idPrefix = "",
    nested,
  } = options ?? {};

  const devices = Object.values(hass.devices);
  const entities = Object.values(hass.entities);

  let deviceEntityLookup: DeviceEntityDisplayLookup = {};

  const filtersEntities =
    includeDomains || excludeDomains || includeDeviceClasses || entityFilter;

  if (filtersEntities) {
    deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
  }

  // Targeting a device also targets its child devices (a parent inherits its
  // children's entities), so a device should match an entity-based filter when
  // it OR any of its children has a matching entity. Build a parent -> children
  // map and resolve each device's effective entity set accordingly. Nesting is
  // single-level, so one hop covers it.
  const filterChildrenByParent = new Map<string, DeviceRegistryEntry[]>();
  if (filtersEntities) {
    for (const device of devices) {
      if (device.parent_device_id) {
        const siblings = filterChildrenByParent.get(device.parent_device_id);
        if (siblings) {
          siblings.push(device);
        } else {
          filterChildrenByParent.set(device.parent_device_id, [device]);
        }
      }
    }
  }
  const effectiveEntities = (
    deviceId: string
  ): EntityRegistryDisplayEntry[] => {
    const own = deviceEntityLookup[deviceId] ?? [];
    const children = filterChildrenByParent.get(deviceId);
    if (!children) {
      return own;
    }
    const combined = [...own];
    for (const child of children) {
      const childEntities = deviceEntityLookup[child.id];
      if (childEntities) {
        combined.push(...childEntities);
      }
    }
    return combined;
  };

  let inputDevices = devices.filter(
    (device) => device.id === value || !device.disabled_by
  );

  if (includeDomains) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = effectiveEntities(device.id);
      if (!devEntities.length) {
        return false;
      }
      return devEntities.some((entity) =>
        includeDomains.includes(computeDomain(entity.entity_id))
      );
    });
  }

  if (excludeDomains) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = effectiveEntities(device.id);
      if (!devEntities.length) {
        return true;
      }
      return devEntities.every(
        (entity) => !excludeDomains.includes(computeDomain(entity.entity_id))
      );
    });
  }

  if (excludeDevices) {
    inputDevices = inputDevices.filter(
      (device) => !excludeDevices!.includes(device.id)
    );
  }

  if (includeDeviceClasses) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = effectiveEntities(device.id);
      if (!devEntities.length) {
        return false;
      }
      return devEntities.some((entity) => {
        const stateObj = hass.states[entity.entity_id];
        if (!stateObj) {
          return false;
        }
        return (
          stateObj.attributes.device_class &&
          includeDeviceClasses.includes(stateObj.attributes.device_class)
        );
      });
    });
  }

  if (entityFilter) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = effectiveEntities(device.id);
      if (!devEntities.length) {
        return false;
      }
      return devEntities.some((entity) => {
        const stateObj = hass.states[entity.entity_id];
        if (!stateObj) {
          return false;
        }
        return entityFilter(stateObj);
      });
    });
  }

  if (deviceFilter) {
    inputDevices = inputDevices.filter(
      (device) =>
        // We always want to include the device of the current value
        device.id === value || deviceFilter!(device)
    );
  }

  const outputDevices = inputDevices.map<DevicePickerItem>((device) => {
    const deviceName = computeDeviceNameDisplay(
      device,
      hass.localize,
      hass.states,
      deviceEntityLookup[device.id]
    );

    const { areaName, viaDeviceName, viaDeviceAreaName, parentDeviceName } =
      computeDeviceAreaLabel(
        device,
        hass.areas,
        hass.devices,
        hass.states,
        hass.localize,
        hass.language,
        hass.translationMetadata,
        device.via_device_id
          ? deviceEntityLookup[device.via_device_id]
          : undefined
      );

    const configEntry = device.primary_config_entry
      ? configEntryLookup?.[device.primary_config_entry]
      : undefined;

    const domain = configEntry?.domain;
    const domainName = domain ? domainToName(hass.localize, domain) : undefined;
    const primary =
      deviceName || hass.localize("ui.components.device-picker.unnamed_device");

    return {
      id: `${idPrefix}${device.id}`,
      label: "",
      primary,
      secondary: areaName,
      domain: configEntry?.domain,
      domain_name: domainName,
      search_labels: {
        deviceName,
        areaName: areaName || null,
        domain: domain || null,
        domainName: domainName || null,
        viaDeviceName: viaDeviceName || null,
        viaDeviceArea: viaDeviceAreaName || null,
        parentDeviceName: parentDeviceName || null,
      },
      sorting_label: [primary, areaName, domainName].filter(Boolean).join("_"),
    };
  });

  if (!nested) {
    return outputDevices;
  }

  // Order children directly after their parent and flag them for indented
  // rendering. outputDevices is 1:1 with inputDevices, so we can pair them up.
  const itemByDeviceId = new Map<string, DevicePickerItem>();
  inputDevices.forEach((device, index) => {
    itemByDeviceId.set(device.id, outputDevices[index]);
  });
  const presentIds = new Set(inputDevices.map((device) => device.id));

  const childrenByParent = new Map<string, DeviceRegistryEntry[]>();
  const topLevel: DeviceRegistryEntry[] = [];
  for (const device of inputDevices) {
    const parentId = device.parent_device_id;
    // A child whose parent was filtered out is shown as a top-level row.
    if (parentId && presentIds.has(parentId)) {
      const siblings = childrenByParent.get(parentId);
      if (siblings) {
        siblings.push(device);
      } else {
        childrenByParent.set(parentId, [device]);
      }
    } else {
      topLevel.push(device);
    }
  }

  const compareByName = (a: DeviceRegistryEntry, b: DeviceRegistryEntry) =>
    caseInsensitiveStringCompare(
      itemByDeviceId.get(a.id)!.primary,
      itemByDeviceId.get(b.id)!.primary,
      hass.locale.language
    );

  topLevel.sort(compareByName);

  const ordered: DevicePickerItem[] = [];
  for (const device of topLevel) {
    const parentItem = itemByDeviceId.get(device.id)!;
    const children = childrenByParent.get(device.id);
    if (children) {
      children.sort(compareByName);
      // Add the children's names to the parent's search terms so a search that
      // matches a child keeps the parent visible (mirrors how a floor stays
      // visible when one of its areas matches).
      ordered.push({
        ...parentItem,
        search_labels: {
          ...parentItem.search_labels,
          childDeviceNames: children
            .map((child) => itemByDeviceId.get(child.id)!.primary)
            .join(" "),
        },
      });
      children.forEach((child, index) => {
        ordered.push({
          ...itemByDeviceId.get(child.id)!,
          is_child: true,
          last: index === children.length - 1,
        });
      });
    } else {
      ordered.push(parentItem);
    }
  }

  return ordered;
};
