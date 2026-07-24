import { ASSIST_ENTITIES } from "../../../../../common/const";
import { getEntityContext } from "../../../../../common/entity/context/get_entity_context";
import type { EntityFilter } from "../../../../../common/entity/entity_filter";
import {
  findEntities,
  generateEntityFilter,
} from "../../../../../common/entity/entity_filter";
import type { HomeAssistant } from "../../../../../types";

export const OTHER_DEVICES_FILTERS: EntityFilter[] = [
  {
    area: null,
    hidden_platform: [
      "automation",
      "script",
      "hassio",
      "backup",
      "mobile_app",
      "zone",
      "person",
    ],
    hidden_domains: [
      "ai_task",
      "automation",
      "configurator",
      "device_tracker",
      "event",
      "geo_location",
      "notify",
      "persistent_notification",
      "script",
      "sun",
      "tag",
      "todo",
      "zone",
      ...ASSIST_ENTITIES,
    ],
  },
];

export interface OtherDeviceEntities {
  device_id: string;
  entities: string[];
}

/**
 * The area-less entities the other devices view renders: matched by
 * OTHER_DEVICES_FILTERS, limited to primary entities and grouped by device
 * (entities without a device are not shown). Shared with the home overview
 * so the devices tile is only shown when the view has content.
 */
export const getOtherDevicesEntities = (
  hass: HomeAssistant
): OtherDeviceEntities[] => {
  const allEntities = Object.keys(hass.states);

  const otherDevicesFilters = OTHER_DEVICES_FILTERS.map((filter) =>
    generateEntityFilter(hass, filter)
  );

  const otherDevicesEntities = findEntities(allEntities, otherDevicesFilters);

  const primaryFilter = generateEntityFilter(hass, {
    entity_category: "none",
  });

  const entitiesByDevice: Record<string, string[]> = {};
  for (const entityId of otherDevicesEntities) {
    const stateObj = hass.states[entityId];
    if (!stateObj || !primaryFilter(entityId)) continue;
    const { device } = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );
    if (!device) {
      continue;
    }
    if (!(device.id in entitiesByDevice)) {
      entitiesByDevice[device.id] = [];
    }
    entitiesByDevice[device.id].push(entityId);
  }

  return Object.entries(entitiesByDevice).map(([deviceId, entities]) => ({
    device_id: deviceId,
    entities: entities,
  }));
};
