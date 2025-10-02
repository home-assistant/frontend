import type { HassEntity } from "home-assistant-js-websocket";
import { getGraphColorByIndex } from "../../common/color/colors";
import { hex2rgb, lab2hex, rgb2lab } from "../../common/color/convert-color";
import { labBrighten } from "../../common/color/lab";
import { computeDomain } from "../../common/entity/compute_domain";
import { stateColorProperties } from "../../common/entity/state_color";
import { UNAVAILABLE, UNKNOWN } from "../../data/entity";
import { computeCssValue } from "../../resources/css-variables";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { FIXED_DOMAIN_STATES } from "../../common/entity/get_states";

const DOMAIN_STATE_SHADES: Record<string, Record<string, number>> = {
  media_player: {
    paused: 0.5,
    idle: 1,
  },
  vacuum: {
    returning: 0.5,
  },
};

function computeTimelineStateColor(
  state: string,
  computedStyles: CSSStyleDeclaration,
  stateObj?: HassEntity
): string | undefined {
  if (!stateObj || state === UNAVAILABLE) {
    return computeCssValue("--history-unavailable-color", computedStyles);
  }

  if (state === UNKNOWN) {
    return computeCssValue("--history-unknown-color", computedStyles);
  }

  const properties = stateColorProperties(stateObj, state);

  if (!properties) {
    return undefined;
  }

  const rgb = computeCssValue(properties, computedStyles);

  if (!rgb) return undefined;

  const domain = computeDomain(stateObj.entity_id);
  const shade = DOMAIN_STATE_SHADES[domain]?.[state] as number | number;
  if (!shade) {
    return rgb;
  }
  return lab2hex(labBrighten(rgb2lab(hex2rgb(rgb)), shade));
}

let colorIndex = 0;
const stateColorMap = new Map<string, string>();

function computeTimelineEnumColor(
  state: string,
  computedStyles: CSSStyleDeclaration,
  stateObj?: HassEntity
): string | undefined {
  if (!stateObj) {
    return undefined;
  }
  const domain = computeStateDomain(stateObj);
  const states =
    FIXED_DOMAIN_STATES[domain] ||
    (domain === "sensor" &&
      stateObj.attributes.device_class === "enum" &&
      stateObj.attributes.options) ||
    [];
  const idx = states.indexOf(state);
  if (idx === -1) {
    return undefined;
  }
  return getGraphColorByIndex(idx, computedStyles);
}

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
    computeTimelineEnumColor(state, computedStyles, stateObj) ||
    computeTimeLineGenericColor(state, computedStyles)
  );
}
