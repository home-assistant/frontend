import { HomeAssistant } from "../../types";
import { HassioResponse, hassioApiResultExtractor } from "./common";

export interface HassioHardwareAudioDevice {
  device?: string;
  name: string;
}

interface HassioHardwareAudioList {
  audio: { input: any; output: any };
}

export const fetchHassioHardwareAudio = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHardwareAudioList>>(
      "GET",
      "hassio/hardware/audio"
    )
  );
};
