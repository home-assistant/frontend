import {
  UnitOfApparentPower,
  UnitOfConcentration,
  UnitOfConductivity,
  UnitOfDataRate,
  UnitOfElectricCurrent,
  UnitOfElectricPotential,
  UnitOfEnergy,
  UnitOfInformation,
  UnitOfLength,
  UnitOfMass,
  UnitOfPower,
  UnitOfPressure,
  UnitOfReactiveEnergy,
  UnitOfReactivePower,
  UnitOfSpeed,
  UnitOfVolume,
  UnitOfVolumeFlowRate,
} from "../unit-conversion/const";

const SI_PREFIX_MULTIPLIERS: Record<string, number> = {
  T: 1e12,
  G: 1e9,
  M: 1e6,
  k: 1e3,
  m: 1e-3,
  "\u00B5": 1e-6, // µ (micro sign)
  "\u03BC": 1e-6, // μ (greek small letter mu)
};

// The following units support converting SI prefixes. This is used to ensure
// we don't convert SI-like unit prefixes that are not in fact SI prefixes.
const SUPPORTED_BASE_UNITS: string[] = [
  UnitOfPower.WATT,
  UnitOfApparentPower.VOLT_AMPERE,
  UnitOfReactivePower.VOLT_AMPERE_REACTIVE,
  UnitOfEnergy.CALORIE,
  UnitOfEnergy.WATT_HOUR,
  UnitOfReactiveEnergy.VOLT_AMPERE_REACTIVE_HOUR,
  UnitOfElectricPotential.VOLT,
  UnitOfElectricCurrent.AMPERE,
  UnitOfLength.METERS,
  UnitOfSpeed.METERS_PER_SECOND,
  UnitOfMass.GRAMS,
  UnitOfConcentration.GRAMS_PER_CUBIC_METER,
  UnitOfVolume.LITERS,
  UnitOfVolumeFlowRate.LITERS_PER_SECOND,
  UnitOfPressure.PA,
  UnitOfInformation.BITS,
  UnitOfInformation.BYTES,
  UnitOfDataRate.BITS_PER_SECOND,
  UnitOfDataRate.BYTES_PER_SECOND,
  UnitOfConductivity.SIEMENS_PER_CM,
];

/**
 * Normalize a numeric value by detecting SI unit prefixes (T, G, M, k, m, µ).
 * Only applies to the base units in SUPPORTED_BASE_UNITS to avoid false positives
 */
export const normalizeValueBySIPrefix = (
  value: number,
  unit: string | undefined
): number => {
  if (!unit || unit.length <= 1) {
    return value;
  }
  const prefix = unit[0];
  if (
    SUPPORTED_BASE_UNITS.includes(unit.slice(1)) &&
    prefix in SI_PREFIX_MULTIPLIERS
  ) {
    return value * SI_PREFIX_MULTIPLIERS[prefix];
  }
  return value;
};
