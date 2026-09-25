import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import { computeFloorName } from "../../../../common/entity/compute_floor_name";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { HomeAssistant, HomeAssistantRegistries } from "../../../../types";

export const getTargetText = (
  registries: HomeAssistantRegistries,
  states: HomeAssistant["states"],
  localize: LocalizeFunc,
  targetType: "floor" | "area" | "device" | "entity" | "label",
  targetId: string,
  getLabel?: (id: string) => LabelRegistryEntry | undefined
): string => {
  if (targetType === "floor") {
    return (
      (registries.floors[targetId] &&
        computeFloorName(registries.floors[targetId])) ||
      localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_floor"
      )
    );
  }
  if (targetType === "area") {
    return (
      (registries.areas[targetId] &&
        computeAreaName(registries.areas[targetId])) ||
      localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_area"
      )
    );
  }
  if (targetType === "device") {
    return (
      (registries.devices[targetId] &&
        computeDeviceName(registries.devices[targetId])) ||
      localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_device"
      )
    );
  }
  if (targetType === "entity" && states[targetId]) {
    const stateObj = states[targetId];
    const [entityName, deviceName] = computeEntityNameList(
      stateObj,
      [{ type: "entity" }, { type: "device" }, { type: "area" }],
      registries.entities,
      registries.devices,
      registries.areas,
      registries.floors
    );

    return entityName || deviceName || targetId;
  }
  if (targetType === "entity") {
    return localize(
      "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_entity"
    );
  }

  if (targetType === "label" && getLabel) {
    const label = getLabel(targetId);
    return (
      label?.name ||
      localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_label"
      )
    );
  }

  return targetId;
};
