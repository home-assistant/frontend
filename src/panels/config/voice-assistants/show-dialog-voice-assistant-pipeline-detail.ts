import { fireEvent } from "../../../common/dom/fire_event";
import {
  AssistPipeline,
  AssistPipelineMutableParams,
} from "../../../data/assist_pipeline";

export interface VoiceAssistantPipelineDetailsDialogParams {
  pipeline?: AssistPipeline;
  createPipeline: (values: AssistPipelineMutableParams) => Promise<unknown>;
  updatePipeline: (
    updates: Partial<AssistPipelineMutableParams>
  ) => Promise<unknown>;
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
