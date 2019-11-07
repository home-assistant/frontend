import { HomeAssistant } from "../types";

interface ProcessResults {
  card: { [key: string]: { [key: string]: string } };
  speech: {
    [SpeechType in "plain" | "ssml"]: { extra_data: any; speech: string }
  };
}

export interface ConversationAttribution {
  name: string;
  url: string;
}

export interface ConversationOnboarding {
  text: string;
  url: string;
}

export const processText = (
  hass: HomeAssistant,
  text: string
): Promise<ProcessResults> =>
  hass.callApi("POST", "conversation/process", { text });

export const getConversationOnboarding = (
  hass: HomeAssistant
): Promise<ConversationOnboarding> =>
  hass.callWS({
    type: "conversation/onboarding/get",
  });

export const setConversationOnboarding = (
  hass: HomeAssistant,
  value: boolean
): Promise<boolean> =>
  hass.callWS({
    type: "conversation/onboarding/set",
    data: { onboarded: value },
  });

export const getConversationAttribution = (
  hass: HomeAssistant
): Promise<ConversationAttribution> =>
  hass.callWS({
    type: "conversation/attribution",
  });
