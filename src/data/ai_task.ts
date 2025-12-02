import type { HomeAssistant } from "../types";
import type { Selector } from "./selector";

export const enum AITaskEntityFeature {
  GENERATE_DATA = 1,
  SUPPORT_ATTACHMENTS = 2,
  GENERATE_IMAGE = 4,
}
export interface AITaskPreferences {
  gen_data_entity_id: string | null;
  gen_image_entity_id: string | null;
}

export interface GenDataTask {
  task_name: string;
  entity_id?: string;
  instructions: string;
  structure?: AITaskStructure;
}

export interface GenDataTaskResult<T = string> {
  conversation_id: string;
  data: T;
}

export interface AITaskStructureField {
  description?: string;
  required?: boolean;
  selector: Selector;
}

export type AITaskStructure = Record<string, AITaskStructureField>;

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

export const generateDataAITask = async <T = string>(
  hass: HomeAssistant,
  task: GenDataTask
): Promise<GenDataTaskResult<T>> => {
  const result = await hass.callService<GenDataTaskResult<T>>(
    "ai_task",
    "generate_data",
    task,
    undefined,
    true,
    true
  );
  return result.response!;
};
