import type { HassEntity } from "home-assistant-js-websocket";
import type { BatterySourceTypeEnergyPreference } from "./energy";

const capacityUnitFactors: Record<string, number> = {
  Wh: 0.001,
  kWh: 1,
  MWh: 1000,
};

export const batteryCapacityUnits = Object.keys(capacityUnitFactors);

export const getBatteryCapacity = (
  source: BatterySourceTypeEnergyPreference,
  states: Record<string, HassEntity | undefined> | undefined
): number | undefined => {
  let capacity = source.capacity;
  if (source.entity_capacity) {
    const entity = states?.[source.entity_capacity];
    const unit = entity?.attributes.unit_of_measurement;
    const factor =
      unit && Object.prototype.hasOwnProperty.call(capacityUnitFactors, unit)
        ? capacityUnitFactors[unit]
        : undefined;
    capacity = entity && factor ? Number(entity.state) * factor : undefined;
  }
  return capacity != null && Number.isFinite(capacity) && capacity > 0
    ? capacity
    : undefined;
};
