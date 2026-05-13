/**
 * Shared CodeMirror completion-item builders for HA entity / device / area
 * selectors.
 *
 * Used by both the Jinja template editor (`ha-code-editor.ts`) and the YAML
 * field-schema editor (`yaml_ha_completions.ts`) so the two always produce
 * identical completion items for the same HA registry data.
 *
 * Each builder follows the same convention:
 *   label        — "friendly name + ID" concatenated so filtering works on both
 *   displayLabel — only the friendly name (what the user actually sees)
 *   detail       — the raw ID (shown as secondary text)
 *   apply        — the raw ID (what gets inserted)
 */

import type { Completion } from "@codemirror/autocomplete";
import type { HassEntities } from "home-assistant-js-websocket";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDeviceName } from "../common/entity/compute_device_name";
import type { AreaRegistryEntry } from "../data/area/area_registry";
import type { DeviceRegistryEntry } from "../data/device/device_registry";

/**
 * Build completion items for entity IDs.
 * `label` is "friendly name + entity_id" for search; `displayLabel` shows only
 * the entity_id; `detail` shows the friendly name.
 */
export function buildEntityCompletions(states: HassEntities): Completion[] {
  return Object.keys(states).map((entityId) => {
    const friendlyName = states[entityId].attributes.friendly_name as
      | string
      | undefined;
    return {
      type: "variable",
      label: friendlyName ? `${friendlyName} ${entityId}` : entityId,
      displayLabel: entityId,
      detail: friendlyName,
      apply: entityId,
    };
  });
}

/**
 * Build completion items for device IDs.
 * `label` is "name + id" for search; `displayLabel` shows only the name;
 * `detail` shows the device ID.
 */
export function buildDeviceCompletions(
  devices: Record<string, DeviceRegistryEntry>
): Completion[] {
  return Object.values(devices)
    .filter((device) => !device.disabled_by)
    .map((device) => {
      const name = computeDeviceName(device) ?? device.id;
      return {
        type: "variable",
        label: `${name} ${device.id}`,
        displayLabel: name,
        detail: device.id,
        apply: device.id,
      };
    });
}

/**
 * Build completion items for area IDs.
 * `label` is "name + area_id" for search; `displayLabel` shows only the name;
 * `detail` shows the area ID.
 */
export function buildAreaCompletions(
  areas: Record<string, AreaRegistryEntry>
): Completion[] {
  return Object.values(areas).map((area) => {
    const name = computeAreaName(area) ?? area.area_id;
    return {
      type: "variable",
      label: `${name} ${area.area_id}`,
      displayLabel: name,
      detail: area.area_id,
      apply: area.area_id,
    };
  });
}
