import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

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

export interface HassioHardwareInfo {
  serial: string[];
  input: string[];
  disk: string[];
  gpio: string[];
  audio: Record<string, unknown>;
}

export const fetchHassioHardwareAudio = async (
  hass: HomeAssistant
): Promise<HassioHardwareAudioList> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return await hass.callWS({
      type: "supervisor/api",
      endpoint: `/hardware/audio`,
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHardwareAudioList>>(
      "GET",
      "hassio/hardware/audio"
    )
  );
};

export const fetchHassioHardwareInfo = async (
  hass: HomeAssistant
): Promise<HassioHardwareInfo> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return await hass.callWS({
      type: "supervisor/api",
      endpoint: `/hardware/info`,
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHardwareInfo>>(
      "GET",
      "hassio/hardware/info"
    )
  );
};
