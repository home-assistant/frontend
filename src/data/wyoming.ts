import type { HomeAssistant } from "../types";

export interface WyomingInfo {
  asr: WyomingAsrInfo[];
  handle: WyomingHandleInfo[];
  intent: WyomingIntentInfo[];
  tts: WyomingTtsInfo[];
  wake: WyomingWakeInfo[];
  mic: WyomingMicInfo[];
  snd: WyomingSndInfo[];
  satellite?: WyomingSatelliteInfo;
}

interface WyomingBaseInfo {
  name: string;
  attribution: { name: string; url: string };
  installed: boolean;
  description: string | null;
  version: string | null;
}

interface WyomingModelInfo extends WyomingBaseInfo {
  languages: string[];
}

interface WyomingAudioFormat {
  rate: number;
  width: number;
  channels: number;
}

interface WyomingTtsVoiceInfo extends WyomingModelInfo {
  speakers: { name: string }[] | null;
}

interface WyomingTtsInfo extends WyomingBaseInfo {
  voices: WyomingTtsVoiceInfo[];
  supports_synthesize_streaming: boolean;
}

interface WyomingAsrInfo extends WyomingBaseInfo {
  models: WyomingModelInfo[];
  supports_transcript_streaming: boolean;
  requires_external_vad: boolean;
  prefers_auto_gain_enabled: boolean;
  prefers_noise_reduction_enabled: boolean;
}

interface WyomingHandleInfo extends WyomingBaseInfo {
  models: WyomingModelInfo[];
  supports_handled_streaming: boolean;
  supports_home_control: boolean;
}

interface WyomingIntentInfo extends WyomingBaseInfo {
  models: WyomingModelInfo[];
}

interface WyomingWakeModelInfo extends WyomingModelInfo {
  phrase: string | null;
}

interface WyomingWakeInfo extends WyomingBaseInfo {
  models: WyomingWakeModelInfo[];
}

interface WyomingMicInfo extends WyomingBaseInfo {
  mic_format: WyomingAudioFormat;
}

interface WyomingSndInfo extends WyomingBaseInfo {
  snd_format: WyomingAudioFormat;
}

interface WyomingSatelliteInfo extends WyomingBaseInfo {
  area: string | null;
  has_vad: boolean | null;
  active_wake_words: string[] | null;
  max_active_wake_words: number | null;
  supports_trigger: boolean | null;
}

export const fetchWyomingInfo = (hass: HomeAssistant) =>
  hass.callWS<{ info: Record<string, WyomingInfo> }>({ type: "wyoming/info" });
