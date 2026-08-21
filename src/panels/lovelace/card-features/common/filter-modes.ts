import type { AlarmModeItem } from "../types";
import type { AlarmMode } from "../../../../data/alarm_control_panel";

export const filterModes = <T extends string = string>(
  supportedModes: T[] | undefined,
  selectedModes: T[] | undefined
): T[] =>
  selectedModes
    ? selectedModes.filter((mode) => (supportedModes || []).includes(mode))
    : supportedModes || [];

/*
 * A `modes` entry is either a plain mode string (default icon) or an object
 * with a per-mode icon override.
 */
export const normalizeAlarmModeItem = (
  item: AlarmModeItem
): { mode: AlarmMode; icon?: string } =>
  typeof item === "string" ? { mode: item } : item;
