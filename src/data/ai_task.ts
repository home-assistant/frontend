import type { HomeAssistant } from "../types";
import type { MediaSelectorValue, Selector } from "./selector";

export enum AITaskEntityFeature {
  GENERATE_DATA = 1,
  SUPPORT_ATTACHMENTS = 2,
  GENERATE_IMAGE = 4,
  EVALUATE = 8,
}
export interface AITaskPreferences {
  evaluate_entity_id: string | null;
  allow_automatic_evaluation: boolean;
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

export interface NoulQuestion {
  type: "noul";
  instructions: string;
}

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  // Option keys mapped to their descriptions, at least two
  criteria: Record<string, string>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  // Level descriptions ordered from lowest to highest, at least two
  criteria: string[];
}

export type EvaluationQuestion = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface EvaluationTask {
  task_name: string;
  entity_id?: string;
  // Text or JSON data. Required when there are no attachments.
  state?: unknown;
  questions: Record<string, EvaluationQuestion>;
  attachments?: MediaSelectorValue[];
}

export interface NoulAnswer {
  type: "noul";
  // Probability of yes
  noul: number;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
}

export interface ScoreAnswer {
  type: "score";
  // Expected level index
  score: number;
  probabilities: number[];
}

export type EvaluationAnswer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface EvaluationTaskResult {
  answers: Record<string, EvaluationAnswer>;
}

export const fetchAITaskPreferences = (callWS: HomeAssistant["callWS"]) =>
  callWS<AITaskPreferences>({
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
  callService: HomeAssistant["callService"],
  task: GenDataTask
): Promise<GenDataTaskResult<T>> => {
  const result = await callService<GenDataTaskResult<T>>(
    "ai_task",
    "generate_data",
    task,
    undefined,
    true,
    true
  );
  return result.response!;
};

export const evaluateAITask = async (
  hass: HomeAssistant,
  task: EvaluationTask
): Promise<EvaluationTaskResult> => {
  const result = await hass.callService<EvaluationTaskResult>(
    "ai_task",
    "evaluate",
    task,
    undefined,
    true,
    true
  );
  return result.response!;
};
