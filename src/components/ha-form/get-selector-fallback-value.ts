import { DEFAULT_MIN_KELVIN } from "../../common/color/convert-light-color";
import type { Selector } from "../../data/selector";

/**
 * Value a selector already displays when no field value is set.
 * Used when enabling an optional service/trigger/condition field.
 */
export const getSelectorFallbackValue = (selector: Selector): unknown => {
  if ("constant" in selector) {
    return selector.constant?.value;
  }
  if ("boolean" in selector) {
    return false;
  }
  if ("number" in selector) {
    return selector.number?.min ?? 0;
  }
  if ("color_temp" in selector) {
    if (selector.color_temp?.unit === "kelvin") {
      return selector.color_temp.min ?? DEFAULT_MIN_KELVIN;
    }
    return selector.color_temp?.min ?? selector.color_temp?.min_mireds ?? 153;
  }
  return undefined;
};
