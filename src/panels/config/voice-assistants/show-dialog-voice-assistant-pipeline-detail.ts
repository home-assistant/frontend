import { fireEvent } from "../../../common/dom/fire_event";
import {
  AssistPipeline,
  AssistPipelineMutableParams,
} from "../../../data/assist_pipeline";

export interface VoiceAssistantPipelineDetailsDialogParams {
  cloudActiveSubscription?: boolean;
  pipeline?: AssistPipeline;
  preferred?: boolean;
  createPipeline: (values: AssistPipelineMutableParams) => Promise<unknown>;
  updatePipeline: (updates: AssistPipelineMutableParams) => Promise<unknown>;
  setPipelinePreferred: () => Promise<unknown>;
  deletePipeline: () => Promise<boolean>;
}

export const loadVoiceAssistantPipelineDetailDialog = () =>
  import("./dialog-voice-assistant-pipeline-detail");

export const showVoiceAssistantPipelineDetailDialog = (
  element: HTMLElement,
  dialogParams: VoiceAssistantPipelineDetailsDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-voice-assistant-pipeline-detail",
    dialogImport: loadVoiceAssistantPipelineDetailDialog,
    dialogParams,
  });
};
