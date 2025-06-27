import type { HomeAssistant } from "../types";

export interface AITaskPreferences {
  gen_data_entity_id: string | null;
}

export interface GenDataTaskResult {
  conversation_id: string;
  data: string;
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

export const generateDataAITask = async (
  hass: HomeAssistant,
  task: {
    task_name: string;
    entity_id?: string;
    instructions: string;
  }
): Promise<GenDataTaskResult> => {
  const result = await hass.callService<GenDataTaskResult>(
    "ai_task",
    "generate_data",
    task,
    undefined,
    true,
    true
  );
  return result.response!;
};
