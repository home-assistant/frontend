import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityPickerDisplay } from "../../../../common/entity/compute_entity_name_display";
import { computeFloorName } from "../../../../common/entity/compute_floor_name";
import { getDeviceArea } from "../../../../common/entity/context/get_device_context";
import { computeRTL } from "../../../../common/util/compute_rtl";
import {
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../../../data/area/area_registry";
import { getDeviceEntityLookup } from "../../../../data/device/device_registry";
import { getFloorAreaLookup } from "../../../../data/floor_registry";
import type { DomainManifestLookup } from "../../../../data/integration";
import { domainToName } from "../../../../data/integration";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { SingleHassServiceTarget } from "../../../../data/target";
import type {
  HomeAssistant,
  HomeAssistantInternationalization,
  HomeAssistantRegistries,
} from "../../../../types";
import { getTargetText } from "../target/get_target_text";

export interface TargetLabelSources {
  i18n: HomeAssistantInternationalization;
  registries: HomeAssistantRegistries;
  states: HomeAssistant["states"];
  manifests?: DomainManifestLookup;
  getLabel: (id: string) => LabelRegistryEntry | undefined;
}

// Targets without ID are virtual tree nodes, like "unassigned devices" (area)
// or all entities of a domain (entity_<domain>)
export const extractTypeAndIdFromTarget = (
  target: SingleHassServiceTarget
): [string, string | undefined] => {
  const [targetTypeId, targetId] = Object.entries(target)[0];
  const targetType = targetTypeId.replace("_id", "");
  return [targetType, targetId];
};

export const isTargetWithId = (target?: SingleHassServiceTarget): boolean =>
  !!target && !!Object.values(target)[0];

export const getSelectedTargetLabel = (
  { i18n, registries, states, manifests, getLabel }: TargetLabelSources,
  target: SingleHassServiceTarget
): string | undefined => {
  const { localize } = i18n;
  const [targetType, targetId] = extractTypeAndIdFromTarget(target);

  if (targetId !== undefined) {
    return targetId
      ? getTargetText(
          registries,
          states,
          localize,
          targetType as "floor" | "area" | "device" | "entity" | "label",
          targetId,
          getLabel
        )
      : undefined;
  }

  switch (targetType) {
    case "floor":
      return localize("ui.panel.config.automation.editor.other_areas");
    case "area":
      return localize("ui.panel.config.automation.editor.unassigned_devices");
    case "service":
      return localize("ui.panel.config.automation.editor.services");
    case "person":
      return localize("ui.panel.config.person.caption");
    case "device":
      return localize("ui.panel.config.automation.editor.unassigned_entities");
    case "helper":
      return localize("ui.panel.config.automation.editor.helpers");
  }

  if (targetType.startsWith("entity_") || targetType.startsWith("helper_")) {
    const domain = targetType.substring(7);
    return domainToName(localize, domain, manifests?.[domain]);
  }

  return undefined;
};

export const getTargetSubtitle = (
  { i18n, registries, states, manifests }: TargetLabelSources,
  target: SingleHassServiceTarget
): string | undefined => {
  const { localize } = i18n;
  const [targetType, targetId] = extractTypeAndIdFromTarget(target);
  if (!targetId) {
    return undefined;
  }

  if (targetType === "area") {
    const floorId = registries.areas[targetId]?.floor_id;
    return floorId
      ? computeFloorName(registries.floors[floorId]) || floorId
      : localize("ui.panel.config.automation.editor.other_areas");
  }

  if (targetType === "device") {
    const device = registries.devices[targetId];
    const area = device
      ? getDeviceArea(device, registries.areas, registries.devices)
      : undefined;
    if (!area) {
      return localize(
        `ui.panel.config.automation.editor.${device?.entry_type === "service" ? "services" : "unassigned_devices"}`
      );
    }
    const parentDevice =
      device?.parent_device_id && device.next_name_part === "parent_device"
        ? registries.devices[device.parent_device_id]
        : undefined;
    const separator = computeRTL(
      i18n.language,
      i18n.translationMetadata.translations
    )
      ? " ◂ "
      : " ▸ ";
    return [
      computeAreaName(area) || area.area_id,
      parentDevice ? computeDeviceName(parentDevice) : undefined,
    ]
      .filter(Boolean)
      .join(separator);
  }

  if (targetType === "entity" && states[targetId]) {
    const entity = registries.entities[targetId];
    if (entity && !entity.device_id && !entity.area_id) {
      const domain = targetId.split(".", 2)[0];
      return domainToName(localize, domain, manifests?.[domain]);
    }
    return computeEntityPickerDisplay(
      {
        entities: registries.entities,
        devices: registries.devices,
        areas: registries.areas,
        floors: registries.floors,
        language: i18n.language,
        translationMetadata: i18n.translationMetadata,
      },
      states[targetId]
    ).secondary;
  }

  return undefined;
};

// Narrow screens hide the tree when the target has nothing left to drill into
export const isTargetTreeHidden = (
  registries: HomeAssistantRegistries,
  target: SingleHassServiceTarget
): boolean => {
  const [targetType, targetId] = extractTypeAndIdFromTarget(target);
  if (!targetId) {
    return false;
  }
  switch (targetType) {
    case "floor":
      return !(
        getFloorAreaLookup(Object.values(registries.areas))[targetId]?.length >
        0
      );
    case "area":
      return (
        !(
          getAreaDeviceLookup(Object.values(registries.devices))[targetId]
            ?.length > 0
        ) &&
        !(
          getAreaEntityLookup(Object.values(registries.entities))[targetId]
            ?.length > 0
        )
      );
    case "device":
      return !(
        getDeviceEntityLookup(Object.values(registries.entities))[targetId]
          ?.length > 0
      );
    case "entity":
    case "label":
      return true;
  }
  return false;
};
