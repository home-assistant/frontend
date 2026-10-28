import { ensureArray } from "../../common/array/ensure-array";
import {
  SENSOR_DEVICE_CLASS_UNITS,
  SENSOR_NUMERIC_DEVICE_CLASSES,
  SENSOR_STATE_CLASS_UNITS,
} from "../sensor_entity_constants";

/**
 * Collect the units of the given classes.
 *
 * @returns `undefined` when one of the classes does not restrict the units
 */
const unitsForClasses = (
  classes: string[],
  table: Record<string, (string | null)[]>,
  isNonNumeric: (key: string) => boolean
): Set<string | null> | undefined => {
  const units = new Set<string | null>();
  for (const key of classes) {
    if (key in table) {
      table[key].forEach((unit) => units.add(unit));
    } else if (isNonNumeric(key)) {
      units.add(null);
    } else {
      return undefined;
    }
  }
  return units;
};

/**
 * Compute the units allowed for a set of sensor device classes and state classes.
 *
 * - Device classes: the union of their units. A non-numeric device class
 *   (e.g. `enum`) only allows "no unit" (`null`); a numeric device class
 *   without a unit table (e.g. `monetary`) does not restrict.
 * - State classes: the union of their units, intersected with the device class
 *   units. A state class without units (e.g. `measurement`) does not restrict.
 *
 * @returns `undefined` when unrestricted (custom unit allowed), `[]` when nothing is allowed
 */
export const computeAllowedUnits = (
  deviceClasses?: string[],
  stateClasses?: string[]
): (string | null)[] | undefined => {
  let allowed = deviceClasses?.length
    ? unitsForClasses(
        deviceClasses,
        SENSOR_DEVICE_CLASS_UNITS,
        (deviceClass) => !SENSOR_NUMERIC_DEVICE_CLASSES.includes(deviceClass)
      )
    : undefined;
  const stateUnits = stateClasses?.length
    ? unitsForClasses(stateClasses, SENSOR_STATE_CLASS_UNITS, () => false)
    : undefined;
  if (stateUnits) {
    allowed = allowed
      ? new Set([...allowed].filter((unit) => stateUnits.has(unit)))
      : stateUnits;
  }
  return allowed ? [...allowed] : undefined;
};

type ClassFilter = string | string[] | null | undefined;

const toClassList = (value: ClassFilter): string[] | undefined => {
  if (!value) {
    return undefined;
  }
  const list = ensureArray(value).filter(Boolean);
  return list.length ? list : undefined;
};

/**
 * Combine the fixed selector config (validated by core) with the form context,
 * which narrows the allowed units further.
 *
 * @returns `undefined` when unrestricted (custom unit allowed), `[]` when nothing is allowed
 */
export const computeSelectorUnits = (
  config?: { device_classes?: ClassFilter; state_classes?: ClassFilter },
  context?: {
    filter_device_class?: ClassFilter;
    filter_state_class?: ClassFilter;
  }
): (string | null)[] | undefined => {
  const fromConfig = computeAllowedUnits(
    toClassList(config?.device_classes),
    toClassList(config?.state_classes)
  );
  const fromContext = computeAllowedUnits(
    toClassList(context?.filter_device_class),
    toClassList(context?.filter_state_class)
  );
  if (fromConfig && fromContext) {
    return fromConfig.filter((unit) => fromContext.includes(unit));
  }
  return fromConfig ?? fromContext;
};
