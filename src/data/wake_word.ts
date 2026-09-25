import type { HomeAssistant } from "../types";

export interface WakeWord {
  id: string;
  name: string;
}

export const fetchWakeWordInfo = (hass: HomeAssistant, entity_id: string) =>
  hass.callWS<{ wake_words: WakeWord[] }>({
    type: "wake_word/info",
    entity_id,
  });
