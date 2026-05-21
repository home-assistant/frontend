import { computeAreaName } from "../../common/entity/compute_area_name";
import { computeDeviceNameDisplay } from "../../common/entity/compute_device_name";
import { computeDomain } from "../../common/entity/compute_domain";
import { getDeviceArea } from "../../common/entity/context/get_device_context";
import type { LocalizeFunc } from "../../common/translations/localize";
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
}

export interface DeviceAreaLabel {
  areaName?: string;
  viaDeviceName?: string;
  viaDeviceAreaName?: string;
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
  const area = getDeviceArea(device, areas);

  const viaDevice = device.via_device_id
    ? devices[device.via_device_id]
    : undefined;
  const viaDeviceName = viaDevice
    ? computeDeviceNameDisplay(viaDevice, localize, states, viaDeviceEntities)
    : undefined;
  const viaDeviceArea = viaDevice ? getDeviceArea(viaDevice, areas) : undefined;
  const viaDeviceAreaName = viaDeviceArea
    ? computeAreaName(viaDeviceArea)
    : undefined;

  const isRTL = computeRTL(language, translationMetadata.translations);

  const areaName = area
    ? computeAreaName(area)
    : viaDeviceAreaName
      ? `${viaDeviceAreaName}${isRTL ? " ◂ " : " ▸ "}${viaDeviceName}`
      : viaDeviceName || undefined;

  return { areaName, viaDeviceName, viaDeviceAreaName };
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
];

export const getDevices = (
  hass: HomeAssistant,
  configEntryLookup: Record<string, ConfigEntry>,
  includeDomains?: string[],
  excludeDomains?: string[],
  includeDeviceClasses?: string[],
  deviceFilter?: HaDevicePickerDeviceFilterFunc,
  entityFilter?: HaEntityPickerEntityFilterFunc,
  excludeDevices?: string[],
  value?: string,
  idPrefix = ""
): DevicePickerItem[] => {
  const devices = Object.values(hass.devices);
  const entities = Object.values(hass.entities);

  let deviceEntityLookup: DeviceEntityDisplayLookup = {};

  if (
    includeDomains ||
    excludeDomains ||
    includeDeviceClasses ||
    entityFilter
  ) {
    deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
  }

  let inputDevices = devices.filter(
    (device) => device.id === value || !device.disabled_by
  );

  if (includeDomains) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = deviceEntityLookup[device.id];
      if (!devEntities || !devEntities.length) {
        return false;
      }
      return deviceEntityLookup[device.id].some((entity) =>
        includeDomains.includes(computeDomain(entity.entity_id))
      );
    });
  }

  if (excludeDomains) {
    inputDevices = inputDevices.filter((device) => {
      const devEntities = deviceEntityLookup[device.id];
      if (!devEntities || !devEntities.length) {
        return true;
      }
      return entities.every(
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
      const devEntities = deviceEntityLookup[device.id];
      if (!devEntities || !devEntities.length) {
        return false;
      }
      return deviceEntityLookup[device.id].some((entity) => {
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
      const devEntities = deviceEntityLookup[device.id];
      if (!devEntities || !devEntities.length) {
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

    const { areaName, viaDeviceName, viaDeviceAreaName } =
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
      },
      sorting_label: [primary, areaName, domainName].filter(Boolean).join("_"),
    };
  });

  return outputDevices;
};
