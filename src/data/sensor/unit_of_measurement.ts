import { ensureArray } from "../../common/array/ensure-array";
import {
  SENSOR_DEVICE_CLASS_UNITS,
  SENSOR_STATE_CLASS_UNITS,
} from "../sensor_entity_constants";

/**
 * Compute the units allowed for a set of sensor device classes and state classes.
 *
 * - Device classes: the union of their units. A device class without units
 *   (e.g. `enum`) allows nothing, `null` means "no unit".
 * - State classes: the union of their units, intersected with the device class
 *   units. State classes without units (e.g. `measurement`) don't restrict.
 *
 * @returns `undefined` when unrestricted (custom unit allowed), `[]` when nothing is allowed
 */
export const computeAllowedUnits = (
  deviceClasses?: string[],
  stateClasses?: string[]
): (string | null)[] | undefined => {
  let allowed: Set<string | null> | undefined;
  if (deviceClasses?.length) {
    allowed = new Set(
      deviceClasses.flatMap((dc) => SENSOR_DEVICE_CLASS_UNITS[dc] ?? [])
    );
  }
  if (stateClasses?.length) {
    const stateUnits = new Set(
      stateClasses.flatMap((sc) => SENSOR_STATE_CLASS_UNITS[sc] ?? [])
    );
    if (stateUnits.size) {
      allowed = allowed
        ? new Set([...allowed].filter((unit) => stateUnits.has(unit)))
        : stateUnits;
    }
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
