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

const TTS_MEDIA_SOURCE_PREFIX = "media-source://tts/";

export const isTTSMediaSource = (mediaContentId: string) =>
  mediaContentId.startsWith(TTS_MEDIA_SOURCE_PREFIX);

export const getProviderFromTTSMediaSource = (mediaContentId: string) =>
  mediaContentId.substring(TTS_MEDIA_SOURCE_PREFIX.length);
