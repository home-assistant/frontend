import type { DeviceConsumptionEnergyPreference } from "../../../data/energy";
import type { HomeAssistant } from "../../../types";
import { getEntityAreaId } from "../../../common/entity/context/get_entity_context";

export function shouldShowFloorsAndAreas(
  devices: DeviceConsumptionEnergyPreference[],
  hass: HomeAssistant,
  getEntityId: (device: DeviceConsumptionEnergyPreference) => string | undefined
): boolean {
  if (!devices.some((d) => d.included_in_stat)) return true;

  const deviceMap = new Map(devices.map((d) => [d.stat_consumption, d]));

  for (const device of devices) {
    if (!device.included_in_stat) continue;

    const parent = deviceMap.get(device.included_in_stat);
    if (!parent) continue;

    const childEntityId = getEntityId(device);
    const parentEntityId = getEntityId(parent);

    if (!childEntityId || !parentEntityId) continue;

    const childArea = getEntityAreaId(
      childEntityId,
      hass.entities,
      hass.devices
    );
    const parentArea = getEntityAreaId(
      parentEntityId,
      hass.entities,
      hass.devices
    );

    if (childArea && parentArea && childArea !== parentArea) return false;
  }

  return true;
}
