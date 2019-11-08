import { HomeAssistant } from "../types";

interface ProcessResults {
  card: { [key: string]: { [key: string]: string } };
  speech: {
    [SpeechType in "plain" | "ssml"]: { extra_data: any; speech: string }
  };
}

export interface AgentInfo {
  attribution?: { name: string; url: string };
  onboarding?: { text: string; url: string };
}

export const processText = (
  hass: HomeAssistant,
  text: string,
  // tslint:disable-next-line: variable-name
  conversation_id: string
): Promise<ProcessResults> =>
  hass.callWS({
    type: "conversation/process",
    text,
    conversation_id,
  });

export const getAgentInfo = (hass: HomeAssistant): Promise<AgentInfo> =>
  hass.callWS({
    type: "conversation/agent/info",
  });

export const setConversationOnboarding = (
  hass: HomeAssistant,
  value: boolean
): Promise<boolean> =>
  hass.callWS({
    type: "conversation/onboarding/set",
    shown: value,
  });
