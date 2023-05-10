import { HomeAssistant } from "../types";

export interface TTSEngine {
  engine_id: string;
  supported_languages?: string[];
}

export interface TTSVoice {
  voice_id: string;
  name: string;
}

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

export const listTTSEngines = (
  hass: HomeAssistant,
  language?: string,
  country?: string
): Promise<{ providers: TTSEngine[] }> =>
  hass.callWS({
    type: "tts/engine/list",
    language,
    country,
  });

export const getTTSEngine = (
  hass: HomeAssistant,
  engine_id: string
): Promise<{ provider: TTSEngine }> =>
  hass.callWS({
    type: "tts/engine/get",
    engine_id,
  });

export const listTTSVoices = (
  hass: HomeAssistant,
  engine_id: string,
  language: string
): Promise<{ voices: TTSVoice[] | null }> =>
  hass.callWS({
    type: "tts/engine/voices",
    engine_id,
    language,
  });
