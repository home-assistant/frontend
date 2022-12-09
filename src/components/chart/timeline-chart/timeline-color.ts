import { HassEntity } from "home-assistant-js-websocket";
import { getGraphColorByIndex } from "../../../common/color/colors";
import { lab2hex, rgb2hex, rgb2lab } from "../../../common/color/convert-color";
import { labBrighten } from "../../../common/color/lab";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { stateColor } from "../../../common/entity/state_color";
import { UNAVAILABLE } from "../../../data/entity";

const DOMAIN_STATE_SHADES: Record<string, Record<string, number>> = {
  media_player: {
    paused: 0.5,
    idle: 1,
  },
  vacuum: {
    returning: 0.5,
  },
};

const cssColorMap: Map<string, [number, number, number]> = new Map();

function cssToRgb(
  cssVariable: string,
  computedStyles: CSSStyleDeclaration
): [number, number, number] | undefined {
  if (!cssVariable.startsWith("--rgb")) {
    return undefined;
  }

  if (cssColorMap.has(cssVariable)) {
    return cssColorMap.get(cssVariable)!;
  }

  const value = computedStyles.getPropertyValue(cssVariable);

  if (!value) return undefined;

  const rgb = value.split(",").map((v) => Number(v)) as [
    number,
    number,
    number
  ];
  cssColorMap.set(cssVariable, rgb);

  return rgb;
}

function computeTimelineStateColor(
  state: string,
  computedStyles: CSSStyleDeclaration,
  stateObj?: HassEntity
): string | undefined {
  if (!stateObj || state === UNAVAILABLE) {
    const rgb = cssToRgb("--rgb-state-unavailable-color", computedStyles);
    if (!rgb) return undefined;
    return rgb2hex(rgb);
  }

  if (!stateActive(stateObj, state)) {
    const rgb = cssToRgb("--rgb-state-off-color", computedStyles);
    if (!rgb) return undefined;
    return rgb2hex(rgb);
  }

  const color = stateColor(stateObj, state);

  if (!color) return undefined;

  const domain = computeDomain(stateObj.entity_id);

  const rgb = cssToRgb(`--rgb-state-${color}-color`, computedStyles);

  if (!rgb) return undefined;

  const shade = DOMAIN_STATE_SHADES[domain]?.[state] as number | number;
  if (!shade) {
    return rgb2hex(rgb);
  }
  return lab2hex(labBrighten(rgb2lab(rgb), shade));
}

let colorIndex = 0;
const stateColorMap: Map<string, string> = new Map();

function computeTimeLineGenericColor(
  state: string,
  computedStyles: CSSStyleDeclaration
): string {
  if (stateColorMap.has(state)) {
    return stateColorMap.get(state)!;
  }
  const color = getGraphColorByIndex(colorIndex, computedStyles);
  colorIndex++;
  stateColorMap.set(state, color);
  return color;
}

export function computeTimelineColor(
  state: string,
  computedStyles: CSSStyleDeclaration,
  stateObj?: HassEntity
): string {
  return (
    computeTimelineStateColor(state, computedStyles, stateObj) ||
    computeTimeLineGenericColor(state, computedStyles)
  );
}
