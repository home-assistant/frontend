import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import { computeFloorName } from "../../../../common/entity/compute_floor_name";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { HomeAssistant } from "../../../../types";

export const getTargetText = (
  hass: HomeAssistant,
  targetType: "floor" | "area" | "device" | "entity" | "label",
  targetId: string,
  getLabel?: (id: string) => LabelRegistryEntry | undefined
): string => {
  if (targetType === "floor") {
    return (
      (hass.floors[targetId] && computeFloorName(hass.floors[targetId])) ||
      hass.localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_floor"
      )
    );
  }
  if (targetType === "area") {
    return (
      (hass.areas[targetId] && computeAreaName(hass.areas[targetId])) ||
      hass.localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_area"
      )
    );
  }
  if (targetType === "device") {
    return (
      (hass.devices[targetId] && computeDeviceName(hass.devices[targetId])) ||
      hass.localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_device"
      )
    );
  }
  if (targetType === "entity" && hass.states[targetId]) {
    const stateObj = hass.states[targetId];
    const [entityName, deviceName] = computeEntityNameList(
      stateObj,
      [{ type: "entity" }, { type: "device" }, { type: "area" }],
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );

    return entityName || deviceName || targetId;
  }
  if (targetType === "entity") {
    return hass.localize(
      "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_entity"
    );
  }

  if (targetType === "label" && getLabel) {
    const label = getLabel(targetId);
    return (
      label?.name ||
      hass.localize(
        "ui.panel.config.automation.editor.actions.type.service.description.target_unknown_label"
      )
    );
  }

  return targetId;
};
