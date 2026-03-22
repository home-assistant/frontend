/** State unit constants */

// This file is based on core/const.py and should be kept updated to reflect any
// changes in core.

/** Units of measurement. */

// Apparent power units
export enum UnitOfApparentPower {
  MILLIVOLT_AMPERE = "mVA",
  VOLT_AMPERE = "VA",
  KILO_VOLT_AMPERE = "kVA",
}

// Power units
export enum UnitOfPower {
  MILLIWATT = "mW",
  WATT = "W",
  KILO_WATT = "kW",
  MEGA_WATT = "MW",
  GIGA_WATT = "GW",
  TERA_WATT = "TW",
  BTU_PER_HOUR = "BTU/h",
}

// Reactive power units
export enum UnitOfReactivePower {
  MILLIVOLT_AMPERE_REACTIVE = "mvar",
  VOLT_AMPERE_REACTIVE = "var",
  KILO_VOLT_AMPERE_REACTIVE = "kvar",
}

// Energy units
export enum UnitOfEnergy {
  JOULE = "J",
  KILO_JOULE = "kJ",
  MEGA_JOULE = "MJ",
  GIGA_JOULE = "GJ",
  MILLIWATT_HOUR = "mWh",
  WATT_HOUR = "Wh",
  KILO_WATT_HOUR = "kWh",
  MEGA_WATT_HOUR = "MWh",
  GIGA_WATT_HOUR = "GWh",
  TERA_WATT_HOUR = "TWh",
  CALORIE = "cal",
  KILO_CALORIE = "kcal",
  MEGA_CALORIE = "Mcal",
  GIGA_CALORIE = "Gcal",
}

// Reactive energy units
export enum UnitOfReactiveEnergy {
  VOLT_AMPERE_REACTIVE_HOUR = "varh",
  KILO_VOLT_AMPERE_REACTIVE_HOUR = "kvarh",
}

// Energy Distance units
export enum UnitOfEnergyDistance {
  KILO_WATT_HOUR_PER_100_KM = "kWh/100km",
  WATT_HOUR_PER_KM = "Wh/km",
  MILES_PER_KILO_WATT_HOUR = "mi/kWh",
  KM_PER_KILO_WATT_HOUR = "km/kWh",
}

// Electric_current units
export enum UnitOfElectricCurrent {
  MILLIAMPERE = "mA",
  AMPERE = "A",
}

// Electric_potential units
export enum UnitOfElectricPotential {
  MICROVOLT = "μV",
  MILLIVOLT = "mV",
  VOLT = "V",
  KILOVOLT = "kV",
  MEGAVOLT = "MV",
}

// Degree units
export const DEGREE = "°";

// Temperature units
export enum UnitOfTemperature {
  CELSIUS = "°C",
  FAHRENHEIT = "°F",
  KELVIN = "K",
}

// Time units
export enum UnitOfTime {
  MICROSECONDS = "μs",
  MILLISECONDS = "ms",
  SECONDS = "s",
  MINUTES = "min",
  HOURS = "h",
  DAYS = "d",
  WEEKS = "w",
  MONTHS = "m",
  YEARS = "y",
}

// Length units
export enum UnitOfLength {
  MILLIMETERS = "mm",
  CENTIMETERS = "cm",
  METERS = "m",
  KILOMETERS = "km",
  INCHES = "in",
  FEET = "ft",
  YARDS = "yd",
  MILES = "mi",
  NAUTICAL_MILES = "nmi",
}

// Frequency units
export enum UnitOfFrequency {
  HERTZ = "Hz",
  KILOHERTZ = "kHz",
  MEGAHERTZ = "MHz",
  GIGAHERTZ = "GHz",
}

// Pressure units
export enum UnitOfPressure {
  MILLIPASCAL = "mPa",
  PA = "Pa",
  HPA = "hPa",
  KPA = "kPa",
  BAR = "bar",
  CBAR = "cbar",
  MBAR = "mbar",
  MMHG = "mmHg",
  INHG = "inHg",
  INH2O = "inH₂O",
  PSI = "psi",
}

// Sound pressure units
export enum UnitOfSoundPressure {
  DECIBEL = "dB",
  WEIGHTED_DECIBEL_A = "dBA",
}

// Volume units
export enum UnitOfVolume {
  CUBIC_FEET = "ft³",
  CENTUM_CUBIC_FEET = "CCF",
  MILLE_CUBIC_FEET = "MCF",
  CUBIC_METERS = "m³",
  LITERS = "L",
  MILLILITERS = "mL",
  GALLONS = "gal",
  // British/Imperial gallons are not yet supported
  FLUID_OUNCES = "fl. oz.",
  // British/Imperial fluid ounces are not yet supported
}

// Volume Flow Rate units
export enum UnitOfVolumeFlowRate {
  CUBIC_METERS_PER_HOUR = "m³/h",
  CUBIC_METERS_PER_MINUTE = "m³/min",
  CUBIC_METERS_PER_SECOND = "m³/s",
  CUBIC_FEET_PER_MINUTE = "ft³/min",
  LITERS_PER_HOUR = "L/h",
  LITERS_PER_MINUTE = "L/min",
  LITERS_PER_SECOND = "L/s",
  GALLONS_PER_HOUR = "gal/h",
  GALLONS_PER_MINUTE = "gal/min",
  GALLONS_PER_DAY = "gal/d",
  MILLILITERS_PER_SECOND = "mL/s",
}

export enum UnitOfArea {
  SQUARE_METERS = "m²",
  SQUARE_CENTIMETERS = "cm²",
  SQUARE_KILOMETERS = "km²",
  SQUARE_MILLIMETERS = "mm²",
  SQUARE_INCHES = "in²",
  SQUARE_FEET = "ft²",
  SQUARE_YARDS = "yd²",
  SQUARE_MILES = "mi²",
  ACRES = "ac",
  HECTARES = "ha",
}

// Mass units
export enum UnitOfMass {
  GRAMS = "g",
  KILOGRAMS = "kg",
  MILLIGRAMS = "mg",
  MICROGRAMS = "μg",
  OUNCES = "oz",
  POUNDS = "lb",
  STONES = "st",
}

export enum UnitOfConductivity {
  SIEMENS_PER_CM = "S/cm",
  MICROSIEMENS_PER_CM = "μS/cm",
  MILLISIEMENS_PER_CM = "mS/cm",
}

// Light units
export const LIGHT_LUX = "lx";

// UV Index units
export const UV_INDEX = "UV index";

// Percentage units
export const PERCENTAGE = "%";

// Rotational speed units
export const REVOLUTIONS_PER_MINUTE = "rpm";

// Irradiance units
export enum UnitOfIrradiance {
  WATTS_PER_SQUARE_METER = "W/m²",
  BTUS_PER_HOUR_SQUARE_FOOT = "BTU/(h⋅ft²)",
}

// Volumetric flux
export enum UnitOfVolumetricFlux {
  // Commonly used for precipitation intensity.
  // The derivation of these units is a volume of rain amassing in a container
  // with constant cross section in a given time
  INCHES_PER_DAY = "in/d",
  INCHES_PER_HOUR = "in/h",
  MILLIMETERS_PER_DAY = "mm/d",
  MILLIMETERS_PER_HOUR = "mm/h",
  // Derived from mm³/(mm²⋅h)
}

// Precipitation depth
export enum UnitOfPrecipitationDepth {
  // The derivation of these units is a volume of rain amassing in a container
  // with constant cross section
  INCHES = "in",
  MILLIMETERS = "mm",
  CENTIMETERS = "cm",
  // Derived from cm³/cm²
}

// Concentration units
export enum UnitOfConcentration {
  GRAMS_PER_CUBIC_METER = "g/m³",
  MILLIGRAMS_PER_CUBIC_METER = "mg/m³",
  MICROGRAMS_PER_CUBIC_METER = "μg/m³",
  MICROGRAMS_PER_CUBIC_FOOT = "μg/ft³",
  PARTS_PER_CUBIC_METER = "p/m³",
  PARTS_PER_MILLION = "ppm",
  PARTS_PER_BILLION = "ppb",
}

// Blood Glucose concentration units
export enum UnitOfBloodGlucoseConcentration {
  MILLIGRAMS_PER_DECILITER = "mg/dL",
  MILLIMOLE_PER_LITER = "mmol/L",
}

// Speed units
export enum UnitOfSpeed {
  BEAUFORT = "Beaufort",
  FEET_PER_SECOND = "ft/s",
  INCHES_PER_SECOND = "in/s",
  METERS_PER_MINUTE = "m/min",
  METERS_PER_SECOND = "m/s",
  KILOMETERS_PER_HOUR = "km/h",
  KNOTS = "kn",
  MILES_PER_HOUR = "mph",
  MILLIMETERS_PER_SECOND = "mm/s",
}

// Signal_strength units
export enum UnitOfSignalStrength {
  SIGNAL_STRENGTH_DECIBELS = "dB",
  SIGNAL_STRENGTH_DECIBELS_MILLIWATT = "dBm",
}

// Data units
export enum UnitOfInformation {
  BITS = "bit",
  KILOBITS = "kbit",
  MEGABITS = "Mbit",
  GIGABITS = "Gbit",
  BYTES = "B",
  KILOBYTES = "kB",
  MEGABYTES = "MB",
  GIGABYTES = "GB",
  TERABYTES = "TB",
  PETABYTES = "PB",
  EXABYTES = "EB",
  ZETTABYTES = "ZB",
  YOTTABYTES = "YB",
  KIBIBYTES = "KiB",
  MEBIBYTES = "MiB",
  GIBIBYTES = "GiB",
  TEBIBYTES = "TiB",
  PEBIBYTES = "PiB",
  EXBIBYTES = "EiB",
  ZEBIBYTES = "ZiB",
  YOBIBYTES = "YiB",
}

// Data-rate units
export enum UnitOfDataRate {
  BITS_PER_SECOND = "bit/s",
  KILOBITS_PER_SECOND = "kbit/s",
  MEGABITS_PER_SECOND = "Mbit/s",
  GIGABITS_PER_SECOND = "Gbit/s",
  BYTES_PER_SECOND = "B/s",
  KILOBYTES_PER_SECOND = "kB/s",
  MEGABYTES_PER_SECOND = "MB/s",
  GIGABYTES_PER_SECOND = "GB/s",
  KIBIBYTES_PER_SECOND = "KiB/s",
  MEBIBYTES_PER_SECOND = "MiB/s",
  GIBIBYTES_PER_SECOND = "GiB/s",
}
