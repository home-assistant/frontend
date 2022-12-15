import { HassEntity } from "home-assistant-js-websocket";
import { getGraphColorByIndex } from "../../../common/color/colors";
import {
  hex2rgb,
  lab2hex,
  rgb2lab,
} from "../../../common/color/convert-color";
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

function cssToHex(
  cssVariable: string,
  computedStyles: CSSStyleDeclaration
): string | undefined {
  if (!cssVariable.endsWith("-color")) {
    return undefined;
  }
  return computedStyles.getPropertyValue(cssVariable).trim() || undefined;
}

function computeTimelineStateColor(
  state: string,
  computedStyles: CSSStyleDeclaration,
  stateObj?: HassEntity
): string | undefined {
  if (!stateObj || state === UNAVAILABLE) {
    return "transparent";
  }

  const color = stateColor(stateObj, state);

  if (!color && !stateActive(stateObj, state)) {
    return cssToHex("--state-inactive-color", computedStyles);
  }

  const rgb = cssToHex(`--state-${color}-color`, computedStyles);

  if (!rgb) return undefined;

  const domain = computeDomain(stateObj.entity_id);
  const shade = DOMAIN_STATE_SHADES[domain]?.[state] as number | number;
  if (!shade) {
    return rgb;
  }
  return lab2hex(labBrighten(rgb2lab(hex2rgb(rgb)), shade));
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
