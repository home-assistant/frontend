/* eslint-disable max-classes-per-file */

/** Unit conversion utilities. */

// This file is based on core/util/unit_conversion.py and should be kept updated
// to reflect any changes in core.

import {
  PERCENTAGE,
  UnitOfApparentPower,
  UnitOfArea,
  UnitOfBloodGlucoseConcentration,
  UnitOfConcentration,
  UnitOfConductivity,
  UnitOfDataRate,
  UnitOfElectricCurrent,
  UnitOfElectricPotential,
  UnitOfEnergy,
  UnitOfEnergyDistance,
  UnitOfInformation,
  UnitOfLength,
  UnitOfMass,
  UnitOfPower,
  UnitOfPressure,
  UnitOfReactiveEnergy,
  UnitOfReactivePower,
  UnitOfSpeed,
  UnitOfTemperature,
  UnitOfTime,
  UnitOfVolume,
  UnitOfVolumeFlowRate,
  UnitOfVolumetricFlux,
} from "./const";

// Distance conversion constants
const _MM_TO_M = 0.001; // 1 mm = 0.001 m
const _CM_TO_M = 0.01; // 1 cm = 0.01 m
const _KM_TO_M = 1000; // 1 km = 1000 m

const _IN_TO_M = 0.0254; // 1 inch = 0.0254 m
const _FOOT_TO_M = _IN_TO_M * 12; // 12 inches = 1 foot (0.3048 m)
const _YARD_TO_M = _FOOT_TO_M * 3; // 3 feet = 1 yard (0.9144 m)
const _MILE_TO_M = _YARD_TO_M * 1760; // 1760 yard = 1 mile (1609.344 m)

const _NAUTICAL_MILE_TO_M = 1852; // 1 nautical mile = 1852 m

// Area constants to square meters
const _CM2_TO_M2 = _CM_TO_M ** 2; // 1 cm² = 0.0001 m²
const _MM2_TO_M2 = _MM_TO_M ** 2; // 1 mm² = 0.000001 m²
const _KM2_TO_M2 = _KM_TO_M ** 2; // 1 km² = 1,000,000 m²

const _IN2_TO_M2 = _IN_TO_M ** 2; // 1 in² = 0.00064516 m²
const _FT2_TO_M2 = _FOOT_TO_M ** 2; // 1 ft² = 0.092903 m²
const _YD2_TO_M2 = _YARD_TO_M ** 2; // 1 yd² = 0.836127 m²
const _MI2_TO_M2 = _MILE_TO_M ** 2; // 1 mi² = 2,590,000 m²

const _ACRE_TO_M2 = 66 * 660 * _FT2_TO_M2; // 1 acre = 4,046.86 m²
const _HECTARE_TO_M2 = 100 * 100; // 1 hectare = 10,000 m²

// Duration conversion constants
const _MIN_TO_SEC = 60; // 1 min = 60 seconds
const _HRS_TO_MINUTES = 60; // 1 hr = 60 minutes
const _HRS_TO_SECS = _HRS_TO_MINUTES * _MIN_TO_SEC; // 1 hr = 60 minutes = 3600 seconds
const _DAYS_TO_HRS = 24; // 1 day = 24 hours
const _DAYS_TO_SECS = _DAYS_TO_HRS * _HRS_TO_SECS; // 1 day = 24 hours = 86400 seconds

// Energy conversion constants
const _WH_TO_J = 3600; // 1 Wh = 3600 J
const _WH_TO_CAL = _WH_TO_J / 4.184; // 1 Wh = 860.42065 cal

// Mass conversion constants
const _POUND_TO_G = 453.59237;
const _OUNCE_TO_G = _POUND_TO_G / 16; // 16 ounces to a pound
const _STONE_TO_G = _POUND_TO_G * 14; // 14 pounds to a stone

// Pressure conversion constants
const _STANDARD_GRAVITY = 9.80665;
const _MERCURY_DENSITY = 13.5951;
const _INH2O_TO_PA = 249.0889083333348; // 1 inH₂O = 249.0889083333348 Pa at 4°C

// Volume conversion constants
const _L_TO_CUBIC_METER = 0.001; // 1 L = 0.001 m³
const _ML_TO_CUBIC_METER = 0.001 * _L_TO_CUBIC_METER; // 1 mL = 0.001 L
const _GALLON_TO_CUBIC_METER = 231 * _IN_TO_M ** 3; // US gallon is 231 cubic inches
const _FLUID_OUNCE_TO_CUBIC_METER = _GALLON_TO_CUBIC_METER / 128; // 128 fl. oz. in a US gallon
const _CUBIC_FOOT_TO_CUBIC_METER = _FOOT_TO_M ** 3;

// Gas concentration conversion constants
const _IDEAL_GAS_CONSTANT = 8.31446261815324; // m3⋅Pa⋅K⁻¹⋅mol⁻¹
// Ambient constants based on European Commission recommendations (20 °C and 1013mb)
const _AMBIENT_TEMPERATURE = 293.15; // K (20 °C)
const _AMBIENT_PRESSURE = 101325; // Pa (1 atm)
const _AMBIENT_IDEAL_GAS_MOLAR_VOLUME = // m3⋅mol⁻¹
  (_IDEAL_GAS_CONSTANT * _AMBIENT_TEMPERATURE) / _AMBIENT_PRESSURE;
// Molar masses in g⋅mol⁻¹
const _CARBON_MONOXIDE_MOLAR_MASS = 28.01;
const _GLUCOSE_MOLAR_MASS = 180.16;
const _NITROGEN_DIOXIDE_MOLAR_MASS = 46.0055;
const _NITROGEN_MONOXIDE_MOLAR_MASS = 30.0061;
const _OZONE_MOLAR_MASS = 48.0;
const _SULPHUR_DIOXIDE_MOLAR_MASS = 64.066;

// Useful conversion factors for HA preferred unit system values
export const LITERS_PER_GALLON = _GALLON_TO_CUBIC_METER / _L_TO_CUBIC_METER;

export type UnitConversionFunction = ((val: number) => number) | undefined;

export abstract class BaseUnitConverter {
  // Define the format of a conversion utility.

  // Class of units this converter handles, e.g. energy
  protected readonly _unitClass!: string;

  // The base unit with conversion ratio of 1 if any.
  protected readonly _baseUnit: string | undefined;

  // All supported units for conversion
  protected readonly _validUnits!: Set<string>;

  protected readonly _unitConversion!: Record<string, number>;

  protected readonly _unitInverses = new Set<string | undefined>();

  public convert(
    value: number,
    fromUnit: string | null | undefined,
    toUnit: string | null | undefined
  ): number {
    // Convert one unit of measurement to another.
    const converter = this.converterFactory(fromUnit, toUnit);
    return converter ? converter(value) : value;
  }

  public convertFromBase(
    value: number,
    toUnit: string | null | undefined
  ): number {
    const converter = this.converterFactory(this._baseUnit, toUnit);
    return converter ? converter(value) : value;
  }

  public convertToBase(
    value: number,
    fromUnit: string | null | undefined
  ): number {
    const converter = this.converterFactory(fromUnit, this._baseUnit);
    return converter ? converter(value) : value;
  }

  public converterFactory(
    fromUnit: string | null | undefined,
    toUnit: string | null | undefined
  ): UnitConversionFunction {
    // Return a function to convert one unit of measurement to another.
    // Map from/to null units to empty string for record search.
    if (fromUnit === null) fromUnit = "";
    if (toUnit === null) toUnit = "";
    // Ensure units are supported
    if (!this._checkSupportedUnits(fromUnit, toUnit)) {
      return undefined;
    }
    // No conversion required if same unit
    if (fromUnit === toUnit) {
      return (val: number): number => val;
    }
    // Otherwise calculate the ratio to convert between the units
    const [fromRatio, toRatio] = this._getFromToRatio(fromUnit, toUnit);
    // And return the correct operation depending on whether units are inverse
    if (this._areUnitInverses(fromUnit, toUnit)) {
      return (val: number): number => toRatio / (val / fromRatio);
    }
    return (val: number): number => (val / fromRatio) * toRatio;
  }

  public getUnitRatio(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): number {
    // Get unit ratio between units of measurement.
    const [fromRatio, toRatio] = this._getFromToRatio(fromUnit, toUnit);
    return fromRatio / toRatio;
  }

  public getBaseUnit(): string | undefined {
    return this._baseUnit;
  }

  public getUnitClass(): string {
    return this._unitClass;
  }

  public getValidUnits(): string[] {
    return [...this._validUnits];
  }

  public isValidUnit(unit: string | undefined): boolean {
    if (!unit) return false;
    return this._validUnits.has(unit);
  }

  protected _checkSupportedUnits(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): boolean {
    return this.isValidUnit(fromUnit) && this.isValidUnit(toUnit);
  }

  protected _getFromToRatio(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): [number, number] {
    // Get unit ratio between units of measurement.
    return [
      this._unitConversion[fromUnit ?? ""],
      this._unitConversion[toUnit ?? ""],
    ];
  }

  protected _areUnitInverses(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): boolean {
    // Return true if one unit is an inverse but not the other.
    return this._unitInverses.has(fromUnit) !== this._unitInverses.has(toUnit);
  }
}

export class ApparentPowerConverter extends BaseUnitConverter {
  // Utility to convert apparent power values.
  _unitClass = "apparent_power";

  _baseUnit = UnitOfApparentPower.VOLT_AMPERE;

  _unitConversion = {
    [UnitOfApparentPower.MILLIVOLT_AMPERE]: 1 * 1000,
    [UnitOfApparentPower.VOLT_AMPERE]: 1,
    [UnitOfApparentPower.KILO_VOLT_AMPERE]: 1 / 1000,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfApparentPower)]);
}

export class AreaConverter extends BaseUnitConverter {
  // Utility to convert area values.
  _unitClass = "area";

  _baseUnit = UnitOfArea.SQUARE_METERS;

  _unitConversion = {
    [UnitOfArea.SQUARE_METERS]: 1,
    [UnitOfArea.SQUARE_CENTIMETERS]: 1 / _CM2_TO_M2,
    [UnitOfArea.SQUARE_MILLIMETERS]: 1 / _MM2_TO_M2,
    [UnitOfArea.SQUARE_KILOMETERS]: 1 / _KM2_TO_M2,
    [UnitOfArea.SQUARE_INCHES]: 1 / _IN2_TO_M2,
    [UnitOfArea.SQUARE_FEET]: 1 / _FT2_TO_M2,
    [UnitOfArea.SQUARE_YARDS]: 1 / _YD2_TO_M2,
    [UnitOfArea.SQUARE_MILES]: 1 / _MI2_TO_M2,
    [UnitOfArea.ACRES]: 1 / _ACRE_TO_M2,
    [UnitOfArea.HECTARES]: 1 / _HECTARE_TO_M2,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfArea)]);
}

export class BloodGlucoseConcentrationConverter extends BaseUnitConverter {
  // Utility to convert blood glucose concentration values.
  _unitClass = "blood_glucose_concentration";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfBloodGlucoseConcentration.MILLIGRAMS_PER_DECILITER]:
      _GLUCOSE_MOLAR_MASS / 10,
    [UnitOfBloodGlucoseConcentration.MILLIMOLE_PER_LITER]: 1,
  };

  _validUnits = new Set<string>([
    ...Object.values(UnitOfBloodGlucoseConcentration),
  ]);
}

export class CarbonMonoxideConcentrationConverter extends BaseUnitConverter {
  // Convert carbon monoxide ratio to mass per volume.
  // Using ambient temperature of 20°C and pressure of 1 ATM.
  _unitClass = "carbon_monoxide";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfConcentration.PARTS_PER_BILLION]: 1e9,
    [UnitOfConcentration.PARTS_PER_MILLION]: 1e6,
    [UnitOfConcentration.MILLIGRAMS_PER_CUBIC_METER]:
      (_CARBON_MONOXIDE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e3,
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]:
      (_CARBON_MONOXIDE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e6,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.PARTS_PER_MILLION,
    UnitOfConcentration.MILLIGRAMS_PER_CUBIC_METER,
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
  ]);
}

export class ConductivityConverter extends BaseUnitConverter {
  // Utility to convert electric current values.
  _unitClass = "conductivity";

  _baseUnit = UnitOfConductivity.MICROSIEMENS_PER_CM;

  _unitConversion = {
    [UnitOfConductivity.MICROSIEMENS_PER_CM]: 1,
    [UnitOfConductivity.MILLISIEMENS_PER_CM]: 1e-3,
    [UnitOfConductivity.SIEMENS_PER_CM]: 1e-6,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfConductivity)]);
}

export class DataRateConverter extends BaseUnitConverter {
  // Utility to convert data rate values.
  _unitClass = "data_rate";

  _baseUnit = UnitOfDataRate.BITS_PER_SECOND;

  // Units in terms of bits
  _unitConversion = {
    [UnitOfDataRate.BITS_PER_SECOND]: 1,
    [UnitOfDataRate.KILOBITS_PER_SECOND]: 1 / 1e3,
    [UnitOfDataRate.MEGABITS_PER_SECOND]: 1 / 1e6,
    [UnitOfDataRate.GIGABITS_PER_SECOND]: 1 / 1e9,
    [UnitOfDataRate.BYTES_PER_SECOND]: 1 / 8,
    [UnitOfDataRate.KILOBYTES_PER_SECOND]: 1 / 8e3,
    [UnitOfDataRate.MEGABYTES_PER_SECOND]: 1 / 8e6,
    [UnitOfDataRate.GIGABYTES_PER_SECOND]: 1 / 8e9,
    [UnitOfDataRate.KIBIBYTES_PER_SECOND]: 1 / 2 ** 13,
    [UnitOfDataRate.MEBIBYTES_PER_SECOND]: 1 / 2 ** 23,
    [UnitOfDataRate.GIBIBYTES_PER_SECOND]: 1 / 2 ** 33,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfDataRate)]);
}

export class DistanceConverter extends BaseUnitConverter {
  // Utility to convert distance values.
  _unitClass = "distance";

  _baseUnit = UnitOfLength.METERS;

  _unitConversion = {
    [UnitOfLength.METERS]: 1,
    [UnitOfLength.MILLIMETERS]: 1 / _MM_TO_M,
    [UnitOfLength.CENTIMETERS]: 1 / _CM_TO_M,
    [UnitOfLength.KILOMETERS]: 1 / _KM_TO_M,
    [UnitOfLength.INCHES]: 1 / _IN_TO_M,
    [UnitOfLength.FEET]: 1 / _FOOT_TO_M,
    [UnitOfLength.YARDS]: 1 / _YARD_TO_M,
    [UnitOfLength.MILES]: 1 / _MILE_TO_M,
    [UnitOfLength.NAUTICAL_MILES]: 1 / _NAUTICAL_MILE_TO_M,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfLength)]);
}

export class DurationConverter extends BaseUnitConverter {
  // Utility to convert duration values.
  _unitClass = "duration";

  _baseUnit = UnitOfTime.SECONDS;

  _unitConversion = {
    [UnitOfTime.MICROSECONDS]: 1000000,
    [UnitOfTime.MILLISECONDS]: 1000,
    [UnitOfTime.SECONDS]: 1,
    [UnitOfTime.MINUTES]: 1 / _MIN_TO_SEC,
    [UnitOfTime.HOURS]: 1 / _HRS_TO_SECS,
    [UnitOfTime.DAYS]: 1 / _DAYS_TO_SECS,
    [UnitOfTime.WEEKS]: 1 / (7 * _DAYS_TO_SECS),
  };

  _validUnits = new Set<string>([
    UnitOfTime.MICROSECONDS,
    UnitOfTime.MILLISECONDS,
    UnitOfTime.SECONDS,
    UnitOfTime.MINUTES,
    UnitOfTime.HOURS,
    UnitOfTime.DAYS,
    UnitOfTime.WEEKS,
  ]);
}

export class ElectricCurrentConverter extends BaseUnitConverter {
  // Utility to convert electric current values.
  _unitClass = "electric_current";

  _baseUnit = UnitOfElectricCurrent.AMPERE;

  _unitConversion = {
    [UnitOfElectricCurrent.AMPERE]: 1,
    [UnitOfElectricCurrent.MILLIAMPERE]: 1e3,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfElectricCurrent)]);
}

export class ElectricPotentialConverter extends BaseUnitConverter {
  // Utility to convert electric potential values.
  _unitClass = "voltage";

  _baseUnit = UnitOfElectricPotential.VOLT;

  _unitConversion = {
    [UnitOfElectricPotential.VOLT]: 1,
    [UnitOfElectricPotential.MILLIVOLT]: 1e3,
    [UnitOfElectricPotential.MICROVOLT]: 1e6,
    [UnitOfElectricPotential.KILOVOLT]: 1 / 1e3,
    [UnitOfElectricPotential.MEGAVOLT]: 1 / 1e6,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfElectricPotential)]);
}

export class EnergyConverter extends BaseUnitConverter {
  // Utility to convert energy values.
  _unitClass = "energy";

  _baseUnit = UnitOfEnergy.KILO_WATT_HOUR;

  _unitConversion = {
    [UnitOfEnergy.JOULE]: _WH_TO_J * 1e3,
    [UnitOfEnergy.KILO_JOULE]: _WH_TO_J,
    [UnitOfEnergy.MEGA_JOULE]: _WH_TO_J / 1e3,
    [UnitOfEnergy.GIGA_JOULE]: _WH_TO_J / 1e6,
    [UnitOfEnergy.MILLIWATT_HOUR]: 1e6,
    [UnitOfEnergy.WATT_HOUR]: 1e3,
    [UnitOfEnergy.KILO_WATT_HOUR]: 1,
    [UnitOfEnergy.MEGA_WATT_HOUR]: 1 / 1e3,
    [UnitOfEnergy.GIGA_WATT_HOUR]: 1 / 1e6,
    [UnitOfEnergy.TERA_WATT_HOUR]: 1 / 1e9,
    [UnitOfEnergy.CALORIE]: _WH_TO_CAL * 1e3,
    [UnitOfEnergy.KILO_CALORIE]: _WH_TO_CAL,
    [UnitOfEnergy.MEGA_CALORIE]: _WH_TO_CAL / 1e3,
    [UnitOfEnergy.GIGA_CALORIE]: _WH_TO_CAL / 1e6,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfEnergy)]);
}

export class EnergyDistanceConverter extends BaseUnitConverter {
  // Utility to convert vehicle energy consumption values.
  _unitClass = "energy_distance";

  _baseUnit = UnitOfEnergyDistance.KILO_WATT_HOUR_PER_100_KM;

  _unitConversion = {
    [UnitOfEnergyDistance.KILO_WATT_HOUR_PER_100_KM]: 1,
    [UnitOfEnergyDistance.WATT_HOUR_PER_KM]: 10,
    [UnitOfEnergyDistance.MILES_PER_KILO_WATT_HOUR]:
      (100 * _KM_TO_M) / _MILE_TO_M,
    [UnitOfEnergyDistance.KM_PER_KILO_WATT_HOUR]: 100,
  };

  _unitInverses = new Set<string | undefined>([
    UnitOfEnergyDistance.MILES_PER_KILO_WATT_HOUR,
    UnitOfEnergyDistance.KM_PER_KILO_WATT_HOUR,
  ]);

  _validUnits = new Set<string>([...Object.values(UnitOfEnergyDistance)]);
}

export class InformationConverter extends BaseUnitConverter {
  // Utility to convert information values.
  _unitClass = "information";

  _baseUnit = UnitOfInformation.BITS; // Units in terms of bits

  _unitConversion = {
    [UnitOfInformation.BITS]: 1,
    [UnitOfInformation.KILOBITS]: 1 / 1e3,
    [UnitOfInformation.MEGABITS]: 1 / 1e6,
    [UnitOfInformation.GIGABITS]: 1 / 1e9,
    [UnitOfInformation.BYTES]: 1 / 8,
    [UnitOfInformation.KILOBYTES]: 1 / 8e3,
    [UnitOfInformation.MEGABYTES]: 1 / 8e6,
    [UnitOfInformation.GIGABYTES]: 1 / 8e9,
    [UnitOfInformation.TERABYTES]: 1 / 8e12,
    [UnitOfInformation.PETABYTES]: 1 / 8e15,
    [UnitOfInformation.EXABYTES]: 1 / 8e18,
    [UnitOfInformation.ZETTABYTES]: 1 / 8e21,
    [UnitOfInformation.YOTTABYTES]: 1 / 8e24,
    [UnitOfInformation.KIBIBYTES]: 1 / 2 ** 13,
    [UnitOfInformation.MEBIBYTES]: 1 / 2 ** 23,
    [UnitOfInformation.GIBIBYTES]: 1 / 2 ** 33,
    [UnitOfInformation.TEBIBYTES]: 1 / 2 ** 43,
    [UnitOfInformation.PEBIBYTES]: 1 / 2 ** 53,
    [UnitOfInformation.EXBIBYTES]: 1 / 2 ** 63,
    [UnitOfInformation.ZEBIBYTES]: 1 / 2 ** 73,
    [UnitOfInformation.YOBIBYTES]: 1 / 2 ** 83,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfInformation)]);
}

export class MassConverter extends BaseUnitConverter {
  // Utility to convert mass values.
  _unitClass = "mass";

  _baseUnit = UnitOfMass.GRAMS;

  _unitConversion = {
    [UnitOfMass.MICROGRAMS]: 1 * 1000 * 1000,
    [UnitOfMass.MILLIGRAMS]: 1 * 1000,
    [UnitOfMass.GRAMS]: 1,
    [UnitOfMass.KILOGRAMS]: 1 / 1000,
    [UnitOfMass.OUNCES]: 1 / _OUNCE_TO_G,
    [UnitOfMass.POUNDS]: 1 / _POUND_TO_G,
    [UnitOfMass.STONES]: 1 / _STONE_TO_G,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfMass)]);
}

export class MassVolumeConcentrationConverter extends BaseUnitConverter {
  // Utility to convert mass volume concentration values.
  _unitClass = "concentration";

  _baseUnit = UnitOfConcentration.GRAMS_PER_CUBIC_METER;

  _unitConversion = {
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]: 1_000_000.0, // 1000 µg/m³ = 1 mg/m³
    [UnitOfConcentration.MILLIGRAMS_PER_CUBIC_METER]: 1000.0, // 1000 mg/m³ = 1 g/m³
    [UnitOfConcentration.GRAMS_PER_CUBIC_METER]: 1.0,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
    UnitOfConcentration.MILLIGRAMS_PER_CUBIC_METER,
    UnitOfConcentration.GRAMS_PER_CUBIC_METER,
  ]);
}

export class NitrogenDioxideConcentrationConverter extends BaseUnitConverter {
  // Convert nitrogen dioxide ratio to mass per volume.
  _unitClass = "nitrogen_dioxide";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfConcentration.PARTS_PER_BILLION]: 1e9,
    [UnitOfConcentration.PARTS_PER_MILLION]: 1e6,
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]:
      (_NITROGEN_DIOXIDE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e6,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.PARTS_PER_MILLION,
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
  ]);
}

export class NitrogenMonoxideConcentrationConverter extends BaseUnitConverter {
  // Convert nitrogen monoxide ratio to mass per volume.
  _unitClass = "nitrogen_monoxide";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfConcentration.PARTS_PER_BILLION]: 1e9,
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]:
      (_NITROGEN_MONOXIDE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e6,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
  ]);
}

export class OzoneConcentrationConverter extends BaseUnitConverter {
  // Convert ozone ratio to mass per volume.
  _unitClass = "ozone";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfConcentration.PARTS_PER_BILLION]: 1e9,
    [UnitOfConcentration.PARTS_PER_MILLION]: 1e6,
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]:
      (_OZONE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e6,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.PARTS_PER_MILLION,
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
  ]);
}

export class PowerConverter extends BaseUnitConverter {
  // Utility to convert power values.
  _unitClass = "power";

  _baseUnit = UnitOfPower.WATT;

  _unitConversion = {
    [UnitOfPower.MILLIWATT]: 1 * 1000,
    [UnitOfPower.WATT]: 1,
    [UnitOfPower.KILO_WATT]: 1 / 1000,
    [UnitOfPower.MEGA_WATT]: 1 / 1e6,
    [UnitOfPower.GIGA_WATT]: 1 / 1e9,
    [UnitOfPower.TERA_WATT]: 1 / 1e12,
    [UnitOfPower.BTU_PER_HOUR]: 1 / 0.29307107,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfPower)]);
}

export class PressureConverter extends BaseUnitConverter {
  // Utility to convert pressure values.
  _unitClass = "pressure";

  _baseUnit = UnitOfPressure.PA;

  _unitConversion = {
    [UnitOfPressure.MILLIPASCAL]: 1 * 1000,
    [UnitOfPressure.PA]: 1,
    [UnitOfPressure.HPA]: 1 / 100,
    [UnitOfPressure.KPA]: 1 / 1000,
    [UnitOfPressure.BAR]: 1 / 100000,
    [UnitOfPressure.CBAR]: 1 / 1000,
    [UnitOfPressure.MBAR]: 1 / 100,
    [UnitOfPressure.INHG]:
      1 / (_IN_TO_M * 1000 * _STANDARD_GRAVITY * _MERCURY_DENSITY),
    [UnitOfPressure.INH2O]: 1 / _INH2O_TO_PA,
    [UnitOfPressure.PSI]: 1 / 6894.757,
    [UnitOfPressure.MMHG]:
      1 / (_MM_TO_M * 1000 * _STANDARD_GRAVITY * _MERCURY_DENSITY),
  };

  _validUnits = new Set<string>([...Object.values(UnitOfPressure)]);
}

export class ReactiveEnergyConverter extends BaseUnitConverter {
  // Utility to convert reactive energy values.
  _unitClass = "reactive_energy";

  _baseUnit = UnitOfReactiveEnergy.VOLT_AMPERE_REACTIVE_HOUR;

  _unitConversion = {
    [UnitOfReactiveEnergy.VOLT_AMPERE_REACTIVE_HOUR]: 1,
    [UnitOfReactiveEnergy.KILO_VOLT_AMPERE_REACTIVE_HOUR]: 1 / 1e3,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfReactiveEnergy)]);
}

export class ReactivePowerConverter extends BaseUnitConverter {
  // Utility to convert reactive power values.
  _unitClass = "reactive_power";

  _baseUnit = UnitOfReactivePower.VOLT_AMPERE_REACTIVE;

  _unitConversion = {
    [UnitOfReactivePower.MILLIVOLT_AMPERE_REACTIVE]: 1 * 1000,
    [UnitOfReactivePower.VOLT_AMPERE_REACTIVE]: 1,
    [UnitOfReactivePower.KILO_VOLT_AMPERE_REACTIVE]: 1 / 1000,
  };

  _validUnits = new Set<string>([
    UnitOfReactivePower.MILLIVOLT_AMPERE_REACTIVE,
    UnitOfReactivePower.VOLT_AMPERE_REACTIVE,
    UnitOfReactivePower.KILO_VOLT_AMPERE_REACTIVE,
  ]);
}

export class SpeedConverter extends BaseUnitConverter {
  // Utility to convert speed values.
  _unitClass = "speed";

  _baseUnit = UnitOfSpeed.METERS_PER_SECOND;

  _unitConversion = {
    [UnitOfVolumetricFlux.INCHES_PER_DAY]: _DAYS_TO_SECS / _IN_TO_M,
    [UnitOfVolumetricFlux.INCHES_PER_HOUR]: _HRS_TO_SECS / _IN_TO_M,
    [UnitOfVolumetricFlux.MILLIMETERS_PER_DAY]: _DAYS_TO_SECS / _MM_TO_M,
    [UnitOfVolumetricFlux.MILLIMETERS_PER_HOUR]: _HRS_TO_SECS / _MM_TO_M,
    [UnitOfSpeed.FEET_PER_SECOND]: 1 / _FOOT_TO_M,
    [UnitOfSpeed.INCHES_PER_SECOND]: 1 / _IN_TO_M,
    [UnitOfSpeed.KILOMETERS_PER_HOUR]: _HRS_TO_SECS / _KM_TO_M,
    [UnitOfSpeed.KNOTS]: _HRS_TO_SECS / _NAUTICAL_MILE_TO_M,
    [UnitOfSpeed.METERS_PER_MINUTE]: _MIN_TO_SEC,
    [UnitOfSpeed.METERS_PER_SECOND]: 1,
    [UnitOfSpeed.MILLIMETERS_PER_SECOND]: 1 / _MM_TO_M,
    [UnitOfSpeed.MILES_PER_HOUR]: _HRS_TO_SECS / _MILE_TO_M,
    [UnitOfSpeed.BEAUFORT]: 1,
  };

  _validUnits = new Set<string>([
    UnitOfVolumetricFlux.INCHES_PER_DAY,
    UnitOfVolumetricFlux.INCHES_PER_HOUR,
    UnitOfVolumetricFlux.MILLIMETERS_PER_DAY,
    UnitOfVolumetricFlux.MILLIMETERS_PER_HOUR,
    UnitOfSpeed.INCHES_PER_SECOND,
    UnitOfSpeed.FEET_PER_SECOND,
    UnitOfSpeed.KILOMETERS_PER_HOUR,
    UnitOfSpeed.KNOTS,
    UnitOfSpeed.METERS_PER_MINUTE,
    UnitOfSpeed.METERS_PER_SECOND,
    UnitOfSpeed.MILES_PER_HOUR,
    UnitOfSpeed.MILLIMETERS_PER_SECOND,
    UnitOfSpeed.BEAUFORT,
  ]);

  public converterFactory(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): UnitConversionFunction {
    // Convert a speed from one unit to another, eg. 14m/s will return 7Bft.
    // We cannot use the implementation from BaseUnitConverter here because the
    // Beaufort scale is not a constant value to divide or multiply with.
    // Map from/to null units to empty string for record search.
    if (fromUnit === null) fromUnit = "";
    if (toUnit === null) toUnit = "";
    // Ensure units are supported
    if (!this._checkSupportedUnits(fromUnit, toUnit)) {
      return undefined;
    }
    // No conversion required if same unit
    if (fromUnit === toUnit) {
      return (val: number): number => val;
    }
    // Otherwise calculate the ratio to convert between the units
    const [fromRatio, toRatio] = this._getFromToRatio(fromUnit, toUnit);
    // And return the correct operation depending on whether units are inverse
    if (fromUnit === UnitOfSpeed.BEAUFORT) {
      return (val) => this._beaufortToMS(val) * toRatio;
    }
    if (toUnit === UnitOfSpeed.BEAUFORT) {
      return (val) => this._msToBeaufort(val / fromRatio);
    }

    // And return the correct operation depending on whether units are inverse
    if (this._areUnitInverses(fromUnit, toUnit)) {
      return (val) => toRatio / (val / fromRatio);
    }
    return (val) => (val / fromRatio) * toRatio;
  }

  private _msToBeaufort = (ms: number): number =>
    Math.round(((ms / 0.836) ** 2) ** (1 / 3)); // Convert a speed in m/s to Beaufort.

  private _beaufortToMS = (beaufort: number): number =>
    0.836 * beaufort ** (3 / 2); // Convert a speed in Beaufort to m/s.
}

export class SulphurDioxideConcentrationConverter extends BaseUnitConverter {
  // Convert sulphur dioxide ratio to mass per volume.
  _unitClass = "sulphur_dioxide";

  _baseUnit = undefined;

  _unitConversion = {
    [UnitOfConcentration.PARTS_PER_BILLION]: 1e9,
    [UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER]:
      (_SULPHUR_DIOXIDE_MOLAR_MASS / _AMBIENT_IDEAL_GAS_MOLAR_VOLUME) * 1e6,
  };

  _validUnits = new Set<string>([
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.MICROGRAMS_PER_CUBIC_METER,
  ]);
}

export class TemperatureDeltaConverter extends BaseUnitConverter {
  // Utility to convert temperature intervals.
  // e.g. a 10°C interval (10°C to 20°C) will return a 18°F (50°F to 68°F) interval
  _unitClass = "temperature_delta";

  _baseUnit = UnitOfTemperature.CELSIUS;

  _unitConversion = {
    [UnitOfTemperature.CELSIUS]: 1.0,
    [UnitOfTemperature.FAHRENHEIT]: 1.8,
    [UnitOfTemperature.KELVIN]: 1.0,
  };

  _validUnits = new Set<string>([...Object.values(UnitOfTemperature)]);
}

export class TemperatureConverter extends TemperatureDeltaConverter {
  // Utility to convert temperature values.
  _unitClass = "temperature";

  public converterFactory(
    fromUnit: string | undefined,
    toUnit: string | undefined
  ): UnitConversionFunction {
    // Convert a speed from one unit to another, eg. 14m/s will return 7Bft.
    // We cannot use the implementation from BaseUnitConverter here because the
    // temperature units do not use the same floor: 0°C, 0°F and 0K do not align
    // Map from/to null units to empty string for record search.
    if (fromUnit === null) fromUnit = "";
    if (toUnit === null) toUnit = "";
    // Ensure units are supported
    if (!this._checkSupportedUnits(fromUnit, toUnit)) {
      return undefined;
    }
    // No conversion required if same unit
    if (fromUnit === toUnit) {
      return (val: number): number => val;
    }
    // Perform known conversions
    if (fromUnit === UnitOfTemperature.CELSIUS) {
      if (toUnit === UnitOfTemperature.FAHRENHEIT)
        return this._celciusToFahrenheit;
      if (toUnit === UnitOfTemperature.KELVIN) return this._celciusToKelvin;
    } else if (fromUnit === UnitOfTemperature.FAHRENHEIT) {
      if (toUnit === UnitOfTemperature.CELSIUS)
        return this._fahrenheitToCelsius;
      if (toUnit === UnitOfTemperature.KELVIN) return this._fahrenheitToKelvin;
    } else if (fromUnit === UnitOfTemperature.KELVIN) {
      if (toUnit === UnitOfTemperature.CELSIUS) return this._kelvinToCelcius;
      if (toUnit === UnitOfTemperature.FAHRENHEIT)
        return this._kelvinToFahrenheit;
    }
    return undefined;
  }

  private _kelvinToFahrenheit = (kelvin: number): number =>
    (kelvin - 273.15) * 1.8 + 32.0; // Convert a temperature in Kelvin to Fahrenheit.

  private _fahrenheitToKelvin = (fahrenheit: number): number =>
    273.15 + (fahrenheit - 32.0) / 1.8; // Convert a temperature in Fahrenheit to Kelvin.

  private _fahrenheitToCelsius = (fahrenheit: number): number =>
    (fahrenheit - 32.0) / 1.8; // Convert a temperature in Fahrenheit to Celsius.

  private _kelvinToCelcius = (kelvin: number): number => kelvin - 273.15; // Convert a temperature in Kelvin to Celsius.

  private _celciusToFahrenheit = (celsius: number): number =>
    celsius * 1.8 + 32.0; // Convert a temperature in Celsius to Fahrenheit.

  private _celciusToKelvin = (celsius: number): number => celsius + 273.15; // Convert a temperature in Celsius to Kelvin.
}

export class UnitlessRatioConverter extends BaseUnitConverter {
  // Utility to convert unitless ratios.
  _unitClass = "unitless";

  _baseUnit = "";

  _unitConversion = {
    "": 1,
    [UnitOfConcentration.PARTS_PER_BILLION]: 1000000000,
    [UnitOfConcentration.PARTS_PER_MILLION]: 1000000,
    [PERCENTAGE]: 100,
  };

  _validUnits = new Set<string>([
    "",
    UnitOfConcentration.PARTS_PER_BILLION,
    UnitOfConcentration.PARTS_PER_MILLION,
    PERCENTAGE,
  ]);
}

export class VolumeConverter extends BaseUnitConverter {
  // Utility to convert volume values.
  _unitClass = "volume";

  _baseUnit = UnitOfVolume.CUBIC_METERS; // Units in terms of m³

  _unitConversion = {
    [UnitOfVolume.LITERS]: 1 / _L_TO_CUBIC_METER,
    [UnitOfVolume.MILLILITERS]: 1 / _ML_TO_CUBIC_METER,
    [UnitOfVolume.GALLONS]: 1 / _GALLON_TO_CUBIC_METER,
    [UnitOfVolume.FLUID_OUNCES]: 1 / _FLUID_OUNCE_TO_CUBIC_METER,
    [UnitOfVolume.CUBIC_METERS]: 1,
    [UnitOfVolume.CUBIC_FEET]: 1 / _CUBIC_FOOT_TO_CUBIC_METER,
    [UnitOfVolume.CENTUM_CUBIC_FEET]: 1 / (100 * _CUBIC_FOOT_TO_CUBIC_METER),
    [UnitOfVolume.MILLE_CUBIC_FEET]: 1 / (1000 * _CUBIC_FOOT_TO_CUBIC_METER),
  };

  _validUnits = new Set<string>([...Object.values(UnitOfVolume)]);
}

export class VolumeFlowRateConverter extends BaseUnitConverter {
  // Utility to convert volume values.
  _unitClass = "volume_flow_rate";

  _baseUnit = UnitOfVolumeFlowRate.CUBIC_METERS_PER_HOUR; // Units in terms of m³/h

  _unitConversion = {
    [UnitOfVolumeFlowRate.CUBIC_METERS_PER_HOUR]: 1,
    [UnitOfVolumeFlowRate.CUBIC_METERS_PER_MINUTE]: 1 / _HRS_TO_MINUTES,
    [UnitOfVolumeFlowRate.CUBIC_METERS_PER_SECOND]: 1 / _HRS_TO_SECS,
    [UnitOfVolumeFlowRate.CUBIC_FEET_PER_MINUTE]:
      1 / (_HRS_TO_MINUTES * _CUBIC_FOOT_TO_CUBIC_METER),
    [UnitOfVolumeFlowRate.LITERS_PER_HOUR]: 1 / _L_TO_CUBIC_METER,
    [UnitOfVolumeFlowRate.LITERS_PER_MINUTE]:
      1 / (_HRS_TO_MINUTES * _L_TO_CUBIC_METER),
    [UnitOfVolumeFlowRate.LITERS_PER_SECOND]:
      1 / (_HRS_TO_SECS * _L_TO_CUBIC_METER),
    [UnitOfVolumeFlowRate.GALLONS_PER_HOUR]: 1 / _GALLON_TO_CUBIC_METER,
    [UnitOfVolumeFlowRate.GALLONS_PER_MINUTE]:
      1 / (_HRS_TO_MINUTES * _GALLON_TO_CUBIC_METER),
    [UnitOfVolumeFlowRate.GALLONS_PER_DAY]:
      _DAYS_TO_HRS / _GALLON_TO_CUBIC_METER,
    [UnitOfVolumeFlowRate.MILLILITERS_PER_SECOND]:
      1 / (_HRS_TO_SECS * _ML_TO_CUBIC_METER),
  };

  _validUnits = new Set<string>([...Object.values(UnitOfVolumeFlowRate)]);
}
