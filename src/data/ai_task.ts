import type { HomeAssistant } from "../types";

export interface AITaskPreferences {
  gen_text_entity_id: string | null;
}

export interface GenTextTaskResult {
  conversation_id: string;
  text: string;
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

export const generateTextAITask = async (
  hass: HomeAssistant,
  task: {
    task_name: string;
    entity_id?: string;
    instructions: string;
  }
): Promise<GenTextTaskResult> => {
  const result = await hass.callService<GenTextTaskResult>(
    "ai_task",
    "generate_text",
    task,
    undefined,
    true,
    true
  );
  return result.response!;
};
