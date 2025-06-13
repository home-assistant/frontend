import type { HomeAssistant } from "../types";

export interface AITaskPreferences {
  gen_text_summary_entity_id: string | null;
  gen_text_generate_entity_id: string | null;
}

export interface GenTextTaskResult {
  conversation_id: string;
  result: string;
}

export const fetchAITaskPreferences = (hass: HomeAssistant) =>
  hass.callWS<AITaskPreferences>({
    type: "ai_task/preferences/get",
  });

export const saveAITaskPreferences = (
  hass: HomeAssistant,
  preferences: Partial<AITaskPreferences>
) =>
  hass.callWS<AITaskPreferences>({
    type: "ai_task/preferences/set",
    ...preferences,
  });

export const generateTextAITask = (
  hass: HomeAssistant,
  task: {
    task_name: string;
    entity_id?: string;
    task_type: "summary" | "generate";
    prompt: string;
  }
) =>
  hass.callWS<GenTextTaskResult>({
    type: "ai_task/generate_text",
    ...task,
  });
