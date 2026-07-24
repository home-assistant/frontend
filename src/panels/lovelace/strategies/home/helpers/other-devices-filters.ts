import { ASSIST_ENTITIES } from "../../../../../common/const";
import { getEntityContext } from "../../../../../common/entity/context/get_entity_context";
import type { EntityFilter } from "../../../../../common/entity/entity_filter";
import { generateEntityFilter } from "../../../../../common/entity/entity_filter";
import type { DeviceRegistryEntry } from "../../../../../data/device/device_registry";
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

// Matches the entities the other devices view renders (area-less primary
// entities that belong to a device) and returns their device.
const makeOtherDevicesEntityMatcher = (hass: HomeAssistant) => {
  const otherDevicesFilters = OTHER_DEVICES_FILTERS.map((filter) =>
    generateEntityFilter(hass, filter)
  );
  const primaryFilter = generateEntityFilter(hass, {
    entity_category: "none",
  });
  return (entityId: string): DeviceRegistryEntry | undefined => {
    const stateObj = hass.states[entityId];
    if (!stateObj) return undefined;
    if (!otherDevicesFilters.some((filter) => filter(entityId))) {
      return undefined;
    }
    if (!primaryFilter(entityId)) return undefined;
    const { device } = getEntityContext(
      stateObj,
      hass.entities,
      hass.devices,
      hass.areas,
      hass.floors
    );
    return device ?? undefined;
  };
};

/**
 * The entities the other devices view renders, grouped by device.
 */
export const getOtherDevicesEntities = (
  hass: HomeAssistant
): OtherDeviceEntities[] => {
  const matcher = makeOtherDevicesEntityMatcher(hass);

  const entitiesByDevice: Record<string, string[]> = {};
  for (const entityId of Object.keys(hass.states)) {
    const device = matcher(entityId);
    if (!device) continue;
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

/**
 * Whether the other devices view has any content. Stops at the first
 * matching entity instead of computing the full device grouping.
 */
export const hasOtherDevicesEntities = (hass: HomeAssistant): boolean => {
  const matcher = makeOtherDevicesEntityMatcher(hass);
  return Object.keys(hass.states).some(
    (entityId) => matcher(entityId) !== undefined
  );
};
