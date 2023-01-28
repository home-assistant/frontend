import { HomeAssistant } from "../types";

export interface WebRtcSettings {
  stun_server?: string;
}

export const fetchWebRtcSettings = async (hass: HomeAssistant) =>
  hass.callWS<WebRtcSettings>({
    type: "rtsp_to_webrtc/get_settings",
  });
