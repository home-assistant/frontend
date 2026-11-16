import type { HassEntities } from "home-assistant-js-websocket";
import type { Selector } from "../../data/selector";

interface KelvinColorTempConfig {
  unit?: "kelvin" | "mired";
  min?: number;
  max?: number;
  min_mireds?: number;
  max_mireds?: number;
}

const kelvinColorTempConfig = (
  selector: Selector
): KelvinColorTempConfig | undefined => {
  if (!("color_temp" in selector) || selector.color_temp == null) {
    return undefined;
  }
  if (selector.color_temp.unit !== "kelvin") {
    return undefined;
  }
  return selector.color_temp;
};

const finiteRange = (
  min: unknown,
  max: unknown
): { min: number; max: number } | undefined => {
  if (typeof min !== "number" || typeof max !== "number") {
    return undefined;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return undefined;
  }
  return { min, max };
};

/**
 * Narrow a Kelvin color-temperature selector to the range targeted lights
 * can produce. The light service schema ships one generic slider for every
 * light. A device may declare a different range on its state.
 *
 * Several lights use the overlap of their ranges, because one
 * `color_temp_kelvin` value is sent to every target. When the ranges do not
 * overlap, the slider spans the widest range so it still has a valid min
 * and max. Lights without a reported range are ignored. The original
 * selector is returned when nothing narrows it.
 */
export const colorTempSelectorForTargets = (
  selector: Selector,
  states: HassEntities,
  targetEntities: readonly string[] | null
): Selector => {
  const config = kelvinColorTempConfig(selector);
  if (!config || !targetEntities?.length) {
    return selector;
  }

  const ranges: { min: number; max: number }[] = [];
  for (const entityId of targetEntities) {
    const attributes = states[entityId]?.attributes;
    const range = finiteRange(
      attributes?.min_color_temp_kelvin,
      attributes?.max_color_temp_kelvin
    );
    if (range) {
      ranges.push(range);
    }
  }
  if (!ranges.length) {
    return selector;
  }

  let min = Math.max(...ranges.map((range) => range.min));
  let max = Math.min(...ranges.map((range) => range.max));
  if (min > max) {
    min = Math.min(...ranges.map((range) => range.min));
    max = Math.max(...ranges.map((range) => range.max));
  }

  if (config.min === min && config.max === max) {
    return selector;
  }

  return {
    color_temp: {
      ...config,
      min,
      max,
    },
  };
};
