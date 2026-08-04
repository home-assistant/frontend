import type { HomeAssistant } from "../../types";

export interface HassioHardwareAudioDevice {
  device?: string | null;
  name: string;
}

interface HassioHardwareAudioList {
  audio: {
    input: Record<string, string>;
    output: Record<string, string>;
  };
}

export interface HardwareDevice {
  attributes: Record<string, string>;
  by_id: null | string;
  dev_path: string;
  name: string;
  subsystem: string;
  sysfs: string;
}

export interface HassioHardwareInfo {
  devices: HardwareDevice[];
}

export const fetchHassioHardwareAudio = async (
  hass: HomeAssistant
): Promise<HassioHardwareAudioList> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/hardware/audio`,
    method: "get",
  });

export const fetchHassioHardwareInfo = async (
  hass: HomeAssistant
): Promise<HassioHardwareInfo> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/hardware/info`,
    method: "get",
  });
