// Import of shared unit factors
import * as _unitFactors from "./unit-factors.json";

// Possible unit conversion operations from JSON file
enum UnitConvertOpType {
  SCALE = "scale", // Multiply by a scale factor (factor != 0)
  OFFSET = "offset", // Add on an offset (offset is numeric)
  POWER = "power", // Raise to the power (power != 0)
  ROUND = "round", // Round to integer (argument unused). Applies only when converting to a unit.
}

// Maps operations to executable functions, in both the from and to directions.
type UnitConvertOpFn = (val: number, param: number) => number;
type UnitConvertOp = [UnitConvertOpFn, number];

const UNIT_CONVERT_FROM_OP: Record<UnitConvertOpType, UnitConvertOpFn> = {
  [UnitConvertOpType.SCALE]: (val: number, scale: number) => val / scale,
  [UnitConvertOpType.OFFSET]: (val: number, offset: number) => val - offset,
  [UnitConvertOpType.POWER]: (val: number, power: number) => val ** (1 / power),
  [UnitConvertOpType.ROUND]: (val: number, _unused) => val,
};

const UNIT_CONVERT_TO_OP: Record<UnitConvertOpType, UnitConvertOpFn> = {
  [UnitConvertOpType.SCALE]: (val: number, scale: number) => val * scale,
  [UnitConvertOpType.OFFSET]: (val: number, offset: number) => val + offset,
  [UnitConvertOpType.POWER]: (val: number, power: number) => val ** power,
  [UnitConvertOpType.ROUND]: (val: number, _unused) => Math.round(val),
};

// Expected typing for imported JSON data, along with validation that each unit
// class imported as a sensible value.
interface UnitClassConversion {
  base: string;
  units: Record<string, number | [UnitConvertOpType, number][]>;
  inverse?: string[];
  needs_class?: boolean;
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
  protected readonly _unitConversion!: Record<
    string,
    UnitConvertOpInfo[] | number
  >;

  // Whether unit is inverse of its base unit.
  protected readonly _unitInverse!: string[];

  constructor(unitClass: string, conversion: UnitClassConversion) {
    this._unitClass = unitClass;
    this._baseUnit = conversion.base;
    this._unitInverse = conversion.inverse ?? [];
    this._unitConversion = {};
    Object.keys(conversion.units).forEach((key) => {
      const value = conversion.units[key];
      if (this._isScaleFactor(value)) {
        // If a simple scale factor, save the value as is, we will convert to a
        // scale operation later if necessary
        this._unitConversion[key] = value;
      } else {
        // Parse provided operations list ensuring they are valid operations and
        // convert to consistent format for parsing.
        this._unitConversion[key] = value
          .map((op): UnitConvertOpInfo | undefined => {
            const [opType, _factor] = op;
            if (
              !(Object.values(UnitConvertOpType) as string[])?.includes(opType)
            )
              return undefined;
            return op;
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
    // If both units are simple scale factors, then optimise the conversion to
    // a simple multiply by ratio.
    const fromInfo = this._unitConversion[fromUnit];
    const toInfo = this._unitConversion[toUnit];
    if (this._isScaleFactor(fromInfo) && this._isScaleFactor(toInfo)) {
      if (this._areInverseUnits(fromUnit, toUnit)) {
        return toInfo / (value / fromInfo);
      }
      return (value / fromInfo) * toInfo;
    }
    // Otherwise for more complex conversions, prepare conversion operations
    const convertOps: UnitConvertOp[] = [
      ...this._getUnitOps(fromUnit, fromInfo, true),
      ...this._getInverseOp(fromUnit, toUnit),
      ...this._getUnitOps(toUnit, toInfo, false),
    ];
    // And apply them to the value in order
    let result: number = value;
    convertOps.forEach(([op, factor]) => {
      result = op(result, factor);
    });
    return result;
  }

  private _getInverseOp(fromUnit: string, toUnit: string): UnitConvertOp[] {
    return this._areInverseUnits(fromUnit, toUnit)
      ? [[UNIT_CONVERT_TO_OP[UnitConvertOpType.POWER], -1]]
      : [];
  }

  private _getUnitOps(
    unit: string,
    unitInfo: number | UnitConvertOpInfo[],
    from: boolean
  ): UnitConvertOp[] {
    // No operations to perform if unit is already the base unit
    if (unit === this._baseUnit) return [];
    // Otherwise map unit unit conversion to correct direction of operations
    const opMap = from ? UNIT_CONVERT_FROM_OP : UNIT_CONVERT_TO_OP;
    let ops: UnitConvertOp[];
    if (this._isScaleFactor(unitInfo)) {
      ops = [[opMap[UnitConvertOpType.SCALE], unitInfo]];
    } else {
      ops = unitInfo.map(([op, factor]): UnitConvertOp => [opMap[op], factor]);
    }
    // Return ops in reverse order if this is from unit.
    return from ? ops.reverse() : ops;
  }

  private _areInverseUnits(fromUnit: string, toUnit: string): boolean {
    return (
      this._unitInverse.includes(fromUnit) !==
      this._unitInverse.includes(toUnit)
    );
  }

  private _isScaleFactor(info): info is number {
    return typeof info === "number";
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
