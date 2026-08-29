import type { HomeAssistant } from "../types";

export interface LLMApi {
  id: string;
  name: string;
}

export const fetchLLMApis = (hass: HomeAssistant) =>
  hass
    .callWS<{ apis: LLMApi[] }>({ type: "llm/api/list" })
    .then((result) => result.apis);
