import type { HomeAssistant } from "../../../../types";

export type EnergyIntegralUnitPrefix = "k" | null;

/**
 * Returns the unit prefix for an Integral helper that calculates energy from a
 * power sensor, or undefined when the resulting unit is not an energy unit.
 */
export function energyIntegralUnitPrefix(
  powerUnit: string | undefined,
  energyUnits: string[]
): EnergyIntegralUnitPrefix | undefined {
  if (!powerUnit) {
    return undefined;
  }
  // The helper multiplies the unit by hours, which cancels a "/h" divisor
  const unit = powerUnit.endsWith("/h")
    ? powerUnit.slice(0, -2)
    : `${powerUnit}h`;
  // Energy sensors usually report kWh
  if (unit === "Wh") {
    return "k";
  }
  return energyUnits.includes(unit) ? null : undefined;
}

/**
 * Finds an Integral helper that already calculates energy from the power
 * sensor.
 */
export function findEnergyIntegral(
  states: HomeAssistant["states"],
  entities: HomeAssistant["entities"],
  powerEntityId: string,
  exclude: string[] = []
): string | undefined {
  return Object.values(states).find(
    (stateObj) =>
      stateObj.attributes.source === powerEntityId &&
      stateObj.attributes.device_class === "energy" &&
      entities[stateObj.entity_id]?.platform === "integration" &&
      !exclude.includes(stateObj.entity_id)
  )?.entity_id;
}

/**
 * Builds the input for the Integral helper config flow.
 */
export function energyIntegralFlowInput(
  name: string,
  powerEntityId: string,
  unitPrefix: EnergyIntegralUnitPrefix
) {
  return {
    name,
    source: powerEntityId,
    // Power states hold their value until they change, so the left rule is
    // exact, and the interval books constant power at least every 5 minutes
    method: "left",
    max_sub_interval: { hours: 0, minutes: 5, seconds: 0 },
    round: 3,
    unit_time: "h",
    // The helper only infers energy from a power device class, and the energy
    // dashboard needs it
    device_class: "energy",
    ...(unitPrefix ? { unit_prefix: unitPrefix } : {}),
  };
}
