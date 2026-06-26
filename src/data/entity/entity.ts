import type { HassEntity } from "home-assistant-js-websocket";
import { arrayLiteralIncludes } from "../../common/array/literal-includes";

export const UNAVAILABLE = "unavailable";
export const UNKNOWN = "unknown";
export const ON = "on";
export const OFF = "off";

export const OFF_STATES = [UNAVAILABLE, UNKNOWN, OFF] as const;

export const isOffState = arrayLiteralIncludes(OFF_STATES);

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;
