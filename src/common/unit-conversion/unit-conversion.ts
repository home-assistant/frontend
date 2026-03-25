// Import of shared unit factors
import * as _unitFactors from "./unit-factors.json";

// Possible unit conversion operations from JSON file
enum UnitConvertOpType {
  SCALE = "scale",
  OFFSET = "offset",
  POWER = "power",
  ROUND = "round",
}

// Maps operations to executable functions, in both the from and to directions.
type UnitConvertOpFn = (val: number, factor: number) => number;
type UnitConvertOp = [UnitConvertOpFn, number];

const UNIT_CONVERT_FROM_OP: Record<UnitConvertOpType, UnitConvertOpFn> = {
  [UnitConvertOpType.SCALE]: (val: number, factor: number) => val / factor,
  [UnitConvertOpType.OFFSET]: (val: number, factor: number) => val - factor,
  [UnitConvertOpType.POWER]: (val: number, factor: number) =>
    val ** (1 / factor),
  [UnitConvertOpType.ROUND]: (val: number, _factor) => Math.round(val),
};

const UNIT_CONVERT_TO_OP: Record<UnitConvertOpType, UnitConvertOpFn> = {
  [UnitConvertOpType.SCALE]: (val: number, factor: number) => val * factor,
  [UnitConvertOpType.OFFSET]: (val: number, factor: number) => val + factor,
  [UnitConvertOpType.POWER]: (val: number, factor: number) => val ** factor,
  [UnitConvertOpType.ROUND]: (val: number, _factor) => Math.round(val),
};

// Expected typing for imported JSON data, along with validation that each unit
// class imported as a sensible value.
interface UnitClassConversion {
  needs_class?: boolean;
  base: string;
  units: Record<string, number | Record<UnitConvertOpType, number>[]>;
}
function instanceOfObject(object: any): object is object {
  return (
    typeof object === "object" && !Array.isArray(object) && object !== null
  );
}
function instanceOfConversionClass(object: any): object is UnitClassConversion {
  return (
    instanceOfObject(object) &&
    "base" in object &&
    typeof object.base === "string" &&
    "units" in object &&
    instanceOfObject(object.units) &&
    object.base in object.units
  );
}
const UNIT_CLASSES: Record<string, UnitClassConversion> =
  "default" in _unitFactors && instanceOfObject(_unitFactors.default)
    ? Object.entries(_unitFactors.default as Record<string, any>)
        .map(([key, conv]): Record<string, UnitClassConversion> => {
          if (instanceOfConversionClass(conv)) return { [key]: conv };
          return {};
        })
        .reduce((arr, cur) => (cur ? { ...arr, ...cur } : arr), {})
    : {};

// Define unit converter class
type UnitConvertOpInfo = [UnitConvertOpType, number];
export class UnitConverter {
  // Class of units this converter handles, e.g. energy
  protected readonly _unitClass!: string;

  // The base unit with conversion ratio of 1 if any.
  protected readonly _baseUnit!: string;

  // Unit conversion lookup
  protected readonly _unitConversion!: Record<string, UnitConvertOpInfo[]>;

  constructor(unitClass: string, conversion: UnitClassConversion) {
    this._unitClass = unitClass;
    this._baseUnit = conversion.base;
    this._unitConversion = {};
    Object.keys(conversion.units).forEach((key) => {
      const value = conversion.units[key];
      if (typeof value === "number") {
        // If a unit factor is provided as a bar number, assume a scale operation.
        this._unitConversion[key] = [[UnitConvertOpType.SCALE, value]];
      } else {
        // Parse provided operations list ensuring they are valid operations and
        // convert to consistent format for parsing.
        this._unitConversion[key] = value
          .map((op): UnitConvertOpInfo | undefined => {
            const opKey = Object.keys(op).find((opType) =>
              (Object.values(UnitConvertOpType) as string[])?.includes(opType)
            );
            if (!opKey) return undefined;
            return [opKey as UnitConvertOpType, op[opKey]];
          })
          .filter((x) => x !== undefined);
      }
    });
  }

  public convertFromBase(
    value: number,
    toUnit: string | null | undefined
  ): number {
    return this.convert(value, this._baseUnit, toUnit);
  }

  public convertToBase(
    value: number,
    fromUnit: string | null | undefined
  ): number {
    return this.convert(value, fromUnit, this._baseUnit);
  }

  public convert(
    value: number,
    fromUnit: string | null | undefined,
    toUnit: string | null | undefined
  ): number {
    // Return a function to convert one unit of measurement to another.
    fromUnit = fromUnit ?? "";
    toUnit = toUnit ?? "";
    // Ensure units are supported
    if (!this.isValidUnit(fromUnit) || !this.isValidUnit(toUnit)) {
      return value;
    }
    // No conversion required if same unit
    if (fromUnit === toUnit) {
      return value;
    }
    // Otherwise prepare conversion operations
    const convertOps: UnitConvertOp[] = [
      ...this._unitConversion[fromUnit]
        .map(
          ([op, factor]): UnitConvertOp => [UNIT_CONVERT_FROM_OP[op], factor]
        )
        .reverse(),
      ...this._unitConversion[toUnit].map(
        ([op, factor]): UnitConvertOp => [UNIT_CONVERT_TO_OP[op], factor]
      ),
    ];
    // And convert result
    let result: number = value;
    convertOps.forEach(([op, factor]) => {
      result = op(result, factor);
    });
    return result;
  }

  public getBaseUnit(): string {
    return this._baseUnit;
  }

  public getUnitClass(): string {
    return this._unitClass;
  }

  public getValidUnits(): string[] {
    return Object.keys(this._unitConversion);
  }

  public isValidUnit(unit: string | undefined): boolean {
    if (!unit) return false;
    return unit in this._unitConversion;
  }
}

// Create a lookup of primary unit strings to class names
const UNIT_TO_CLASS = Object.entries(UNIT_CLASSES)
  .map(
    ([key, conv]): Record<string, string> =>
      !conv.needs_class
        ? Object.keys(conv.units)
            .map(
              (unit: string): Record<string, string> => ({
                [unit]: key,
              })
            )
            .reduce((arr, cur) => ({ ...arr, ...cur }), {})
        : {}
  )
  .reduce((arr, cur) => ({ ...arr, ...cur }), {});

// Create unit converter objects for each class
const UNIT_CONVERTERS = Object.entries(UNIT_CLASSES)
  .map(
    ([key, conv]): Record<string, UnitConverter> => ({
      [key]: new UnitConverter(key, conv),
    })
  )
  .reduce((arr, cur) => ({ ...arr, ...cur }), {});

// Try to fetch a unit converter for the given unit and/or unit class.
export function getUnitConverter(
  unit: string | null | undefined,
  unitClass?: string | undefined
): UnitConverter | undefined {
  // The unit converter is determined from the unit class and unit if the unit
  // class and unit match, otherwise from the unit.

  // Can't convert undefined units
  if (unit === undefined) return undefined;

  // null units are stored as "" in unit converter records.
  if (unit === null) unit = "";

  // If we have no unit class provided, try and lookup the class from the unit
  if (!unitClass && unit in UNIT_TO_CLASS) {
    unitClass = UNIT_TO_CLASS[unit];
  }

  // If we still have no unit class, or it is invalid, then can't convert
  if (!unitClass || !(unitClass in UNIT_CLASSES)) return undefined;

  // If the unit is supported by this unit class, return the converter.
  return unit in UNIT_CLASSES[unitClass].units
    ? UNIT_CONVERTERS[unitClass]
    : undefined;
}
