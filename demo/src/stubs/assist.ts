import type { AssistPipeline } from "../../../src/data/assist_pipeline";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const pipelines: AssistPipeline[] = [
  {
    id: "01home_assistant_cloud",
    name: "Home Assistant Cloud",
    language: "en",
    conversation_engine: "conversation.home_assistant",
    conversation_language: "en",
    stt_engine: "cloud",
    stt_language: "en-US",
    tts_engine: "cloud",
    tts_language: "en-US",
    tts_voice: "JennyNeural",
    wake_word_entity: null,
    wake_word_id: null,
  },
  {
    id: "01local",
    name: "Local",
    language: "en",
    conversation_engine: "conversation.home_assistant",
    conversation_language: "en",
    stt_engine: "stt.faster_whisper",
    stt_language: "en",
    tts_engine: "tts.piper",
    tts_language: "en",
    tts_voice: null,
    wake_word_entity: null,
    wake_word_id: null,
  },
  {
    id: "01chatgpt",
    name: "ChatGPT",
    language: "en",
    conversation_engine: "conversation.chatgpt",
    conversation_language: "en",
    stt_engine: "cloud",
    stt_language: "en-US",
    tts_engine: "cloud",
    tts_language: "en-US",
    tts_voice: "JennyNeural",
    wake_word_entity: null,
    wake_word_id: null,
  },
];

export const mockAssist = (hass: MockHomeAssistant) => {
  // Stub for assist pipeline list — returns a cloud and a local pipeline so the
  // voice assistants config panel shows configured assistants.
  hass.mockWS("assist_pipeline/pipeline/list", () => ({
    pipelines,
    preferred_pipeline: "01home_assistant_cloud",
  }));

  // Stub for assist pipeline run — immediately sends run-end event so
  // the UI does not hang waiting for a response.
  hass.mockWS("assist_pipeline/run", (_msg, _hass, onChange) => {
    if (onChange) {
      onChange({
        type: "run-end",
      });
    }
    return null;
  });
};
