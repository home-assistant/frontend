import { HomeAssistant } from "../types";

export interface WakeWordInterceptMessage {
  wake_word_phrase: string;
}

export interface WakeWordOption {
  id: string;
  wake_word: string;
  trained_languages: string[];
}

export interface AssistSatelliteConfiguration {
  active_wake_words: string[];
  available_wake_words: WakeWordOption[];
  max_active_wake_words: number;
  pipeline_entity_id: string;
  vad_entity_id: string;
}

export const interceptWakeWord = (
  hass: HomeAssistant,
  entity_id: string,
  callback: (result: WakeWordInterceptMessage) => void
) =>
  hass.connection.subscribeMessage(callback, {
    type: "assist_satellite/intercept_wake_word",
    entity_id,
  });

export const testAssistSatelliteConnection = (
  hass: HomeAssistant,
  entity_id: string
) =>
  hass.callWS<{
    status: "success" | "timeout";
  }>({
    type: "assist_satellite/test_connection",
    entity_id,
  });

export const assistSatelliteAnnounce = (
  hass: HomeAssistant,
  entity_id: string,
  message: string
) =>
  hass.callService("assist_satellite", "announce", { message }, { entity_id });

export const fetchAssistSatelliteConfiguration = (
  hass: HomeAssistant,
  entity_id: string
) =>
  hass.callWS<AssistSatelliteConfiguration>({
    type: "assist_satellite/get_configuration",
    entity_id,
  });

export const setWakeWords = (
  hass: HomeAssistant,
  entity_id: string,
  wake_word_ids: string[]
) =>
  hass.callWS({
    type: "assist_satellite/set_wake_words",
    entity_id,
    wake_word_ids,
  });
