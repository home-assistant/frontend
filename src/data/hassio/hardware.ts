import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export interface HassioHardwareAudioDevice {
  device?: string | null;
  name: string;
}

interface HassioHardwareAudioList {
  audio: {
    input: { [key: string]: string };
    output: { [key: string]: string };
  };
}

export interface HassioHardwareInfo {
  serial: string[];
  input: string[];
  disk: string[];
  gpio: string[];
  audio: Record<string, unknown>;
}

export const fetchHassioHardwareAudio = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHardwareAudioList>>(
      "GET",
      "hassio/hardware/audio"
    )
  );
};

export const fetchHassioHardwareInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHardwareInfo>>(
      "GET",
      "hassio/hardware/info"
    )
  );
};
