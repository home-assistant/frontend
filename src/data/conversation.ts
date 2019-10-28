import { HomeAssistant } from "../types";

interface ProcessResults {
  card: {};
  speech: { plain: { extra_data: null; speech: string } };
}

export const processText = (
  hass: HomeAssistant,
  text: string
): Promise<ProcessResults> =>
  hass.callApi("POST", "conversation/process", { text });
