import { fireEvent } from "../../../common/dom/fire_event";
import {
  VoiceAssistantPipeline,
  VoiceAssistantPipelineMutableParams,
} from "../../../data/voice_assistant";

export interface VoiceAssistantPipelineDetailsDialogParams {
  pipeline?: VoiceAssistantPipeline;
  createPipeline: (
    values: VoiceAssistantPipelineMutableParams
  ) => Promise<unknown>;
  updatePipeline: (
    updates: Partial<VoiceAssistantPipelineMutableParams>
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
