import { HomeAssistant } from "../types";

interface ProcessResults {
  card: { [key: string]: { [key: string]: string } };
  speech: {
    [SpeechType in "plain" | "ssml"]: { extra_data: any; speech: string }
  };
}

export const processText = (
  hass: HomeAssistant,
  text: string,
  // tslint:disable-next-line: variable-name
  conversation_id: string
): Promise<ProcessResults> =>
  hass.callApi("POST", "conversation/process", { text, conversation_id });
