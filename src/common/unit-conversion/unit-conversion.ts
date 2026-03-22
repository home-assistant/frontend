import {
  ApparentPowerConverter,
  AreaConverter,
  BloodGlucoseConcentrationConverter,
  CarbonMonoxideConcentrationConverter,
  ConductivityConverter,
  DataRateConverter,
  DistanceConverter,
  DurationConverter,
  ElectricCurrentConverter,
  ElectricPotentialConverter,
  EnergyConverter,
  EnergyDistanceConverter,
  InformationConverter,
  MassConverter,
  MassVolumeConcentrationConverter,
  NitrogenDioxideConcentrationConverter,
  NitrogenMonoxideConcentrationConverter,
  OzoneConcentrationConverter,
  PowerConverter,
  PressureConverter,
  ReactiveEnergyConverter,
  ReactivePowerConverter,
  SpeedConverter,
  SulphurDioxideConcentrationConverter,
  TemperatureConverter,
  TemperatureDeltaConverter,
  UnitlessRatioConverter,
  VolumeConverter,
  VolumeFlowRateConverter,
  type BaseUnitConverter,
} from "./converter-classes";

// Primary unit converters have a unique set of unit strings, so can be merged
// to perform any default conversions without knowing unit class.
const _PRIMARY_UNIT_CONVERTERS: BaseUnitConverter[] = [
  new ApparentPowerConverter(),
  new AreaConverter(),
  new BloodGlucoseConcentrationConverter(),
  new ConductivityConverter(),
  new DataRateConverter(),
  new DistanceConverter(),
  new DurationConverter(),
  new ElectricCurrentConverter(),
  new ElectricPotentialConverter(),
  new EnergyConverter(),
  new EnergyDistanceConverter(),
  new InformationConverter(),
  new MassConverter(),
  new MassVolumeConcentrationConverter(),
  new PowerConverter(),
  new PressureConverter(),
  new ReactiveEnergyConverter(),
  new ReactivePowerConverter(),
  new SpeedConverter(),
  new TemperatureConverter(),
  new UnitlessRatioConverter(),
  new VolumeConverter(),
  new VolumeFlowRateConverter(),
];

// Additional unit converters which have conflicting unit conversion factors to
// the primary converters. Unit class must be known to select these.
const _SECONDARY_UNIT_CONVERTERS: BaseUnitConverter[] = [
  new CarbonMonoxideConcentrationConverter(),
  new NitrogenDioxideConcentrationConverter(),
  new NitrogenMonoxideConcentrationConverter(),
  new OzoneConcentrationConverter(),
  new SulphurDioxideConcentrationConverter(),
  new TemperatureDeltaConverter(),
];

// Map of units to unit converter.
// This map includes units which can be converted without knowing the unit class.
export const STATISTIC_UNIT_TO_UNIT_CONVERTER: Record<
  string,
  BaseUnitConverter
> = _PRIMARY_UNIT_CONVERTERS
  .map((conv: BaseUnitConverter): Record<string, BaseUnitConverter>[] =>
    conv.getValidUnits().map(
      (unit: string | undefined): Record<string, BaseUnitConverter> => ({
        [unit ?? ""]: conv,
      })
    )
  )
  .reduce((arr, cur) => arr.concat(cur))
  .reduce(
    (arr, dic) => ({ ...arr, ...dic }),
    {} as Record<string, BaseUnitConverter>
  );

// Map of unit classes and their corresponding unit converter.
export const UNIT_CLASS_TO_UNIT_CONVERTER: Record<string, BaseUnitConverter> = [
  ..._PRIMARY_UNIT_CONVERTERS,
  ..._SECONDARY_UNIT_CONVERTERS,
]
  .map(
    (conv: BaseUnitConverter): Record<string, BaseUnitConverter> => ({
      [conv.getUnitClass()]: conv,
    })
  )
  .reduce(
    (arr, dic) => ({ ...arr, ...dic }),
    {} as Record<string, BaseUnitConverter>
  );

// Try to fetch a unit converter for the given unit and/or unit class.
export function getUnitConverter(
  unit: string | null | undefined,
  unitClass?: string | undefined
): BaseUnitConverter | undefined {
  // The unit converter is determined from the unit class and unit if the unit
  // class and unit match, otherwise from the unit.

  // Can't convert undefined units
  if (unit === undefined) return undefined;

  // null units are stored as "" in unit converter records.
  if (unit === null) unit = "";

  // If we have a unit class given, try to find a matching converter by class
  if (unitClass) {
    const converter = UNIT_CLASS_TO_UNIT_CONVERTER[unitClass];
    // Only accept this if the converters units contain our supplied unit.
    if (converter?.isValidUnit(unit)) return converter;
  }

  // Otherwise try to get a converter from just the unit
  return STATISTIC_UNIT_TO_UNIT_CONVERTER[unit];
}
