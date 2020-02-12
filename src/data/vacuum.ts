import {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";

export const VACUUM_SUPPORT_PAUSE = 4;
export const VACUUM_SUPPORT_STOP = 8;
export const VACUUM_SUPPORT_RETURN_HOME = 16;
export const VACUUM_SUPPORT_FAN_SPEED = 32;
export const VACUUM_SUPPORT_BATTERY = 64;
export const VACUUM_SUPPORT_STATUS = 128;
export const VACUUM_SUPPORT_LOCATE = 512;
export const VACUUM_SUPPORT_CLEAN_SPOT = 1024;
export const VACUUM_SUPPORT_START = 8192;

export type VacuumEntity = HassEntityBase & {
  attributes: HassEntityAttributeBase & {
    battery_level: number;
    fan_speed: any;
    [key: string]: any;
  };
};
