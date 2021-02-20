import { HomeAssistant } from "../types";

export const convertTextToSpeech = (
  hass: HomeAssistant,
  data: {
    platform: string;
    message: string;
    cache?: boolean;
    language?: string;
    options?: Record<string, unknown>;
  }
) => hass.callApi<{ url: string; path: string }>("POST", "tts_get_url", data);
