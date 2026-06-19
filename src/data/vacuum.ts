import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import { UNAVAILABLE } from "./entity/entity";

export type VacuumEntityState =
  | "on"
  | "off"
  | "cleaning"
  | "docked"
  | "idle"
  | "paused"
  | "returning"
  | "error";

export enum VacuumEntityFeature {
  TURN_ON = 1,
  TURN_OFF = 2,
  PAUSE = 4,
  STOP = 8,
  RETURN_HOME = 16,
  FAN_SPEED = 32,
  BATTERY = 64,
  STATUS = 128,
  SEND_COMMAND = 256,
  LOCATE = 512,
  CLEAN_SPOT = 1024,
  MAP = 2048,
  STATE = 4096,
  START = 8192,
  CLEAN_AREA = 16384,
}

interface VacuumEntityAttributes extends HassEntityAttributeBase {
  battery_level?: number;
  fan_speed?: any;
  [key: string]: any;
}

export interface VacuumEntity extends HassEntityBase {
  attributes: VacuumEntityAttributes;
}

export function isCleaning(stateObj: VacuumEntity): boolean {
  return ["cleaning", "on"].includes(stateObj.state);
}

export function canStart(stateObj: VacuumEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return !isCleaning(stateObj);
}

export function canStop(stateObj: VacuumEntity): boolean {
  return !["docked", "off", "idle"].includes(stateObj.state);
}

export function canReturnHome(stateObj: VacuumEntity): boolean {
  if (stateObj.state === UNAVAILABLE) {
    return false;
  }
  return stateObj.state !== "returning";
}

export interface Segment {
  id: string;
  name: string;
  group?: string;
}

export const getVacuumSegments = (
  hass: HomeAssistant,
  entity_id: string
): Promise<{ segments: Segment[] }> =>
  hass.callWS({
    type: "vacuum/get_segments",
    entity_id,
  });

// Drop segment IDs the vacuum no longer reports from an area mapping. Orphaned
// IDs left behind make area cleaning fail, so they have to go. Areas left
// without any segment are removed entirely.
export const pruneOrphanedSegments = (
  areaMapping: Record<string, string[]>,
  segments: Segment[]
): Record<string, string[]> => {
  const knownIds = new Set(segments.map((segment) => segment.id));
  const pruned: Record<string, string[]> = {};
  for (const [areaId, segmentIds] of Object.entries(areaMapping)) {
    const kept = segmentIds.filter((id) => knownIds.has(id));
    if (kept.length) {
      pruned[areaId] = kept;
    }
  }
  return pruned;
};
