import type { HomeAssistant } from "../types";

export interface LLMTaskPreferences {
  summary_entity_id: string | null;
  generate_entity_id: string | null;
}

export interface LLMTaskResult {
  conversation_id: string;
  result: string;
}

export const fetchLLMTaskPreferences = (hass: HomeAssistant) =>
  hass.callWS<LLMTaskPreferences>({
    type: "llm_task/preferences/get",
  });

export const saveLLMTaskPreferences = (
  hass: HomeAssistant,
  preferences: Partial<LLMTaskPreferences>
) =>
  hass.callWS<LLMTaskPreferences>({
    type: "llm_task/preferences/set",
    ...preferences,
  });

export const runLLMTask = (
  hass: HomeAssistant,
  task_name: string,
  entity_id: string,
  task_type: "summary" | "generate",
  prompt: string
) =>
  hass.callWS<LLMTaskResult>({
    type: "llm_task/run_task",
    task_name,
    entity_id,
    task_type,
    prompt,
  });
