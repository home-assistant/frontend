import {
  mdiFan,
  mdiFanOff,
  mdiFanSpeed1,
  mdiFanSpeed2,
  mdiFanSpeed3,
} from "@mdi/js";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { stateActive } from "../common/entity/state_active";
import { supportsFeature } from "../common/entity/supports-feature";
import { formatNumber } from "../common/number/format_number";
import { formatListWithAnds } from "../common/string/format-list";
import type {
  HomeAssistant,
  HomeAssistantFormatters,
  HomeAssistantInternationalization,
} from "../types";
import type { FanFavorite } from "./entity/entity_registry";

export enum FanEntityFeature {
  SET_SPEED = 1,
  OSCILLATE = 2,
  DIRECTION = 4,
  PRESET_MODE = 8,
  TURN_OFF = 16,
  TURN_ON = 32,
}

interface FanEntityAttributes extends HassEntityAttributeBase {
  direction?: string;
  oscillating?: boolean;
  percentage?: number;
  percentage_step?: number;
  preset_mode?: string;
  preset_modes?: string[];
}

export interface FanEntity extends HassEntityBase {
  attributes: FanEntityAttributes;
}

export type FanDirection = "forward" | "reverse";

// Named speeds are used when there are icons for every step. Fans with more
// steps use numbered speeds ("1", "2", ...) instead.
export type FanSpeed = "off" | "low" | "medium" | "high" | "on" | `${number}`;

const FAN_SPEEDS_NAMED: Partial<Record<number, FanSpeed[]>> = {
  2: ["off", "on"],
  3: ["off", "low", "high"],
  4: ["off", "low", "medium", "high"],
};

export const FAN_SPEED_COUNT_MAX_FOR_BUTTONS = 6;

export function computeFanSpeedCount(stateObj: FanEntity): number {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedCount = Math.round(100 / step) + 1;
  return speedCount;
}

export function computeFanSpeeds(stateObj: FanEntity): FanSpeed[] | undefined {
  const speedCount = computeFanSpeedCount(stateObj);
  if (speedCount > FAN_SPEED_COUNT_MAX_FOR_BUTTONS) {
    return undefined;
  }
  return (
    FAN_SPEEDS_NAMED[speedCount] ?? [
      "off",
      ...Array.from(
        { length: speedCount - 1 },
        (_, index) => `${index + 1}` as const
      ),
    ]
  );
}

export const isNumberedFanSpeed = (speed: FanSpeed): speed is `${number}` =>
  !isNaN(Number(speed));

export function fanPercentageToSpeed(
  stateObj: FanEntity,
  value: number
): FanSpeed {
  const step = stateObj.attributes.percentage_step ?? 1;
  const speedValue = Math.round(value / step);

  const speeds = computeFanSpeeds(stateObj);
  return speeds?.[speedValue] ?? "off";
}

export function fanSpeedToPercentage(
  stateObj: FanEntity,
  speed: FanSpeed
): number {
  const step = stateObj.attributes.percentage_step ?? 1;

  const speeds = computeFanSpeeds(stateObj);

  if (!speeds) {
    return 0;
  }

  const speedValue = speeds.indexOf(speed);
  if (speedValue === -1) {
    return 0;
  }
  return Math.floor(speedValue * step);
}

export function computeFanSpeedIcon(
  stateObj: FanEntity,
  speed: FanSpeed
): string | undefined {
  if (speed === "on") {
    return mdiFan;
  }
  if (speed === "off") {
    return mdiFanOff;
  }
  if (isNumberedFanSpeed(speed)) {
    return undefined;
  }
  const index = computeFanSpeeds(stateObj)?.indexOf(speed) ?? 1;
  return [mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3][index - 1];
}

export function computeFanSpeedStateDisplay(
  stateObj: FanEntity,
  formatters: Pick<HomeAssistant, "formatEntityAttributeValue">,
  speed?: number
) {
  const percentage = stateActive(stateObj)
    ? stateObj.attributes.percentage
    : undefined;
  const currentSpeed = speed ?? percentage;

  return currentSpeed
    ? formatters.formatEntityAttributeValue(
        stateObj,
        "percentage",
        Math.round(currentSpeed)
      )
    : "";
}

export const fanSupportsFavorites = (stateObj: FanEntity): boolean =>
  supportsFeature(stateObj, FanEntityFeature.SET_SPEED);

const isFanDirection = (value: unknown): value is FanDirection =>
  value === "forward" || value === "reverse";

// Snap a stored percentage to the speed step the core selects for it. The
// core reports floor(k * 100 / n) for speed k and maps a percentage to the
// step at or above it, so ceil keeps every reported percentage unchanged.
// The epsilons absorb float error such as 3 * (100 / 6) = 49.999…
export const snapFanPercentage = (
  stateObj: FanEntity,
  percentage: number
): number => {
  const step = stateObj.attributes.percentage_step ?? 1;
  const stepCount = Math.round(100 / step);
  const stepIndex = Math.min(
    stepCount,
    Math.max(1, Math.ceil(percentage / step - 1e-9))
  );
  return Math.max(1, Math.min(100, Math.floor(stepIndex * step + 1e-9)));
};

// The favorite as it applies to the fan now: values of features the fan no
// longer supports are dropped, and the speed is snapped to a current step.
export const filterFanFavorite = (
  stateObj: FanEntity,
  favorite: FanFavorite
): FanFavorite => {
  const filtered: FanFavorite = {
    percentage: snapFanPercentage(stateObj, favorite.percentage),
  };
  if (
    supportsFeature(stateObj, FanEntityFeature.DIRECTION) &&
    isFanDirection(favorite.direction)
  ) {
    filtered.direction = favorite.direction;
  }
  if (
    supportsFeature(stateObj, FanEntityFeature.OSCILLATE) &&
    typeof favorite.oscillating === "boolean"
  ) {
    filtered.oscillating = favorite.oscillating;
  }
  return filtered;
};

// Build a favorite from the state the fan reports. Returns undefined when the
// fan is off or has no speed, for example while an exclusive preset is active.
export const computeFanFavoriteFromState = (
  stateObj: FanEntity
): FanFavorite | undefined => {
  if (!fanSupportsFavorites(stateObj) || stateObj.state !== "on") {
    return undefined;
  }
  const { percentage, direction, oscillating } = stateObj.attributes;
  if (typeof percentage !== "number" || percentage <= 0) {
    return undefined;
  }
  const favorite: FanFavorite = { percentage };
  if (
    supportsFeature(stateObj, FanEntityFeature.DIRECTION) &&
    isFanDirection(direction)
  ) {
    favorite.direction = direction;
  }
  if (
    supportsFeature(stateObj, FanEntityFeature.OSCILLATE) &&
    typeof oscillating === "boolean"
  ) {
    favorite.oscillating = oscillating;
  }
  return favorite;
};

// Compares favorites as they apply to the fan now, so two favorites that
// render the same are equal.
export const fanFavoritesEqual = (
  stateObj: FanEntity,
  a: FanFavorite,
  b: FanFavorite
): boolean => {
  const filteredA = filterFanFavorite(stateObj, a);
  const filteredB = filterFanFavorite(stateObj, b);
  return (
    filteredA.percentage === filteredB.percentage &&
    filteredA.direction === filteredB.direction &&
    filteredA.oscillating === filteredB.oscillating
  );
};

export const findFanFavoriteIndex = (
  stateObj: FanEntity,
  favorites: FanFavorite[],
  favorite: FanFavorite,
  ignoreIndex?: number
): number =>
  favorites.findIndex(
    (item, index) =>
      index !== ignoreIndex && fanFavoritesEqual(stateObj, item, favorite)
  );

// Drop malformed entries so a hand-edited registry cannot break rendering.
export const normalizeFanFavorites = (
  favorites: FanFavorite[] | undefined
): FanFavorite[] =>
  (favorites ?? []).filter(
    (favorite) =>
      typeof favorite?.percentage === "number" &&
      favorite.percentage > 0 &&
      favorite.percentage <= 100
  );

export type FanSnapshot = {
  state: string;
} & Pick<
  FanEntityAttributes,
  "percentage" | "preset_mode" | "direction" | "oscillating"
>;

// The core reproduces a fan state in order: speed (or turn on), then
// direction, then oscillation. Unlike speed and preset, it compares direction
// and oscillation even when the target leaves them out, and then calls the
// service with None, which fails. Fill them in from the current state so
// that a missing value means "leave unchanged".
export const completeFanSceneState = <T extends FanSnapshot>(
  current: FanEntity,
  target: T
): T => {
  if (target.state !== "on") {
    return target;
  }
  const completed = { ...target };
  const { direction, oscillating } = current.attributes;
  if (completed.direction === undefined && direction != null) {
    completed.direction = direction;
  }
  if (completed.oscillating === undefined && oscillating != null) {
    completed.oscillating = oscillating;
  }
  return completed;
};

// Target state for scene.apply.
export const computeFanFavoriteSceneState = (
  stateObj: FanEntity,
  favorite: FanFavorite
): FanSnapshot =>
  completeFanSceneState(stateObj, {
    state: "on",
    ...filterFanFavorite(stateObj, favorite),
  });

// State to restore after editing favorites. Missing values are left out;
// pass the result through completeFanSceneState before applying it.
export const computeFanSnapshot = (
  stateObj: FanEntity
): FanSnapshot | undefined => {
  if (stateObj.state !== "on" && stateObj.state !== "off") {
    return undefined;
  }
  const snapshot: FanSnapshot = { state: stateObj.state };
  if (stateObj.state === "off") {
    return snapshot;
  }
  const { percentage, preset_mode, direction, oscillating } =
    stateObj.attributes;
  if (percentage != null) {
    snapshot.percentage = percentage;
  }
  if (preset_mode != null) {
    snapshot.preset_mode = preset_mode;
  }
  if (direction != null) {
    snapshot.direction = direction;
  }
  if (oscillating != null) {
    snapshot.oscillating = oscillating;
  }
  return snapshot;
};

// A fan can receive copied favorites when its speed steps match and it
// supports exactly the same direction and oscillation features, so the
// copied favorites define the same fields as on the source.
export const fanAcceptsFavorites = (
  source: FanEntity,
  candidate: FanEntity
): boolean =>
  fanSupportsFavorites(candidate) &&
  (candidate.attributes.percentage_step ?? 1) ===
    (source.attributes.percentage_step ?? 1) &&
  supportsFeature(candidate, FanEntityFeature.DIRECTION) ===
    supportsFeature(source, FanEntityFeature.DIRECTION) &&
  supportsFeature(candidate, FanEntityFeature.OSCILLATE) ===
    supportsFeature(source, FanEntityFeature.OSCILLATE);

export type FanFavoriteSaveBlocker = "no_speed" | "duplicate";

// Why the current state cannot be saved as a favorite, or undefined when it
// can. When updating a favorite, it is not compared with itself.
export const computeFanFavoriteSaveBlocker = (
  stateObj: FanEntity,
  favorites: FanFavorite[],
  selectedIndex?: number
): FanFavoriteSaveBlocker | undefined => {
  const favorite = computeFanFavoriteFromState(stateObj);
  if (!favorite) {
    return "no_speed";
  }
  return findFanFavoriteIndex(stateObj, favorites, favorite, selectedIndex) ===
    -1
    ? undefined
    : "duplicate";
};

type FanFavoriteFormatters = Pick<
  HomeAssistantFormatters,
  "formatEntityState" | "formatEntityAttributeValue"
>;

type FanFavoriteI18n = Pick<
  HomeAssistantInternationalization,
  "localize" | "locale"
>;

const formatFanFavoriteSpeed = (
  stateObj: FanEntity,
  percentage: number,
  formatters: FanFavoriteFormatters,
  i18n: FanFavoriteI18n
): string => {
  if (!computeFanSpeeds(stateObj)) {
    return formatters.formatEntityAttributeValue(
      stateObj,
      "percentage",
      percentage
    );
  }
  const speed = fanPercentageToSpeed(stateObj, percentage);
  if (speed === "on" || speed === "off") {
    return formatters.formatEntityState(stateObj, speed);
  }
  if (isNumberedFanSpeed(speed)) {
    return i18n.localize("ui.card.fan.speed.numbered", {
      speed: formatNumber(speed, i18n.locale),
    });
  }
  return i18n.localize(`ui.card.fan.speed.${speed}`) || speed;
};

// Text summary of a favorite, like "60%, Forward, and Oscillation on", for
// accessible labels and tooltips.
export const formatFanFavorite = (
  stateObj: FanEntity,
  favorite: FanFavorite,
  formatters: FanFavoriteFormatters,
  i18n: FanFavoriteI18n
): string => {
  const filtered = filterFanFavorite(stateObj, favorite);
  const parts = [
    formatFanFavoriteSpeed(stateObj, filtered.percentage, formatters, i18n),
  ];
  if (filtered.direction !== undefined) {
    parts.push(
      formatters.formatEntityAttributeValue(
        stateObj,
        "direction",
        filtered.direction
      )
    );
  }
  if (filtered.oscillating !== undefined) {
    parts.push(
      i18n.localize(
        filtered.oscillating
          ? "ui.card.fan.oscillation_on"
          : "ui.card.fan.oscillation_off"
      )
    );
  }
  return formatListWithAnds(i18n.locale, parts);
};
