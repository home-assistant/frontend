import type { HomeAssistant } from "../types";
import type { ConversationResult } from "./conversation";
import type { SpeechMetadata } from "./stt";

export interface AssistPipeline {
  id: string;
  name: string;
  language: string;
  conversation_engine: string;
  conversation_language: string | null;
  prefer_local_intents: boolean;
  stt_engine: string | null;
  stt_language: string | null;
  tts_engine: string | null;
  tts_language: string | null;
  tts_voice: string | null;
  wake_word_entity: string | null;
  wake_word_id: string | null;
}

export interface AssistDevice {
  device_id: string;
  pipeline_entity: string | null;
}

export interface AssistPipelineMutableParams {
  name: string;
  language: string;
  conversation_engine: string;
  conversation_language: string | null;
  prefer_local_intents?: boolean;
  stt_engine: string | null;
  stt_language: string | null;
  tts_engine: string | null;
  tts_language: string | null;
  tts_voice: string | null;
  wake_word_entity: string | null;
  wake_word_id: string | null;
}

export interface AssistRunListing {
  pipeline_run_id: string;
  timestamp: string;
}

interface PipelineEventBase {
  timestamp: string;
}

interface PipelineRunStartEvent extends PipelineEventBase {
  type: "run-start";
  data: {
    pipeline: string;
    language: string;
    conversation_id: string;
    satellite_id?: string;
    runner_data: {
      stt_binary_handler_id: number | null;
      timeout: number;
    };
    tts_output?: {
      token: string;
      url: string;
      mime_type: string;
      stream_response: boolean;
    };
  };
}
interface PipelineRunEndEvent extends PipelineEventBase {
  type: "run-end";
  data: null;
}

interface PipelineErrorEvent extends PipelineEventBase {
  type: "error";
  data: {
    code: string;
    message: string;
  };
}

interface PipelineWakeWordStartEvent extends PipelineEventBase {
  type: "wake_word-start";
  data: {
    entity_id: string;
    metadata: Omit<SpeechMetadata, "language">;
    timeout: number;
  };
}

interface PipelineWakeWordEndEvent extends PipelineEventBase {
  type: "wake_word-end";
  data: {
    wake_word_output: {
      wake_word_id?: string;
      wake_word_phrase?: string;
      timestamp?: number | null;
    };
  };
}

interface PipelineSTTStartEvent extends PipelineEventBase {
  type: "stt-start";
  data: {
    engine: string;
    metadata: SpeechMetadata;
    audio_processing: {
      requires_external_vad: boolean;
      prefers_auto_gain_enabled: boolean;
      prefers_noise_reduction_enabled: boolean;
    };
  };
}

interface PipelineSTTVADStartEvent extends PipelineEventBase {
  type: "stt-vad-start";
  data: { timestamp: number };
}

interface PipelineSTTVADEndEvent extends PipelineEventBase {
  type: "stt-vad-end";
  data: { timestamp: number };
}
interface PipelineSTTEndEvent extends PipelineEventBase {
  type: "stt-end";
  data: {
    stt_output: { text: string };
  };
}

interface PipelineIntentStartEvent extends PipelineEventBase {
  type: "intent-start";
  data: {
    engine: string;
    language: string;
    intent_input: string;
    conversation_id: string;
    device_id: string | null;
    satellite_id: string | null;
    prefer_local_intents: boolean;
  };
}

export interface ConversationChatLogAssistantDelta {
  role: "assistant";
  content: string;
  thinking_content?: string;
  tool_calls: {
    id: string;
    tool_name: string;
    tool_args: Record<string, unknown>;
    external: boolean;
  }[];
}

export interface ConversationChatLogToolResultDelta {
  role: "tool_result";
  agent_id: string;
  tool_call_id: string;
  tool_name: string;
  result: { data: Record<string, unknown>; error: boolean };
  tool_result: Record<string, unknown>;
  created: string;
}
interface PipelineIntentProgressEvent extends PipelineEventBase {
  type: "intent-progress";
  data: {
    tts_start_streaming?: boolean;
    chat_log_delta?:
      | Partial<ConversationChatLogAssistantDelta>
      // These always come in 1 chunk
      | ConversationChatLogToolResultDelta;
  };
}

interface PipelineIntentEndEvent extends PipelineEventBase {
  type: "intent-end";
  data: {
    processed_locally: boolean;
    intent_output: ConversationResult;
  };
}

interface PipelineTTSStartEvent extends PipelineEventBase {
  type: "tts-start";
  data: {
    engine: string;
    language: string | null;
    voice: string | null;
    tts_input: string;
    acknowledge_override: boolean;
  };
}
interface PipelineTTSEndEvent extends PipelineEventBase {
  type: "tts-end";
  data: {
    tts_output: {
      media_id: string;
      token: string;
      url: string;
      mime_type: string;
    };
  };
}

export type PipelineRunEvent =
  | PipelineRunStartEvent
  | PipelineRunEndEvent
  | PipelineErrorEvent
  | PipelineWakeWordStartEvent
  | PipelineWakeWordEndEvent
  | PipelineSTTStartEvent
  | PipelineSTTVADStartEvent
  | PipelineSTTVADEndEvent
  | PipelineSTTEndEvent
  | PipelineIntentStartEvent
  | PipelineIntentProgressEvent
  | PipelineIntentEndEvent
  | PipelineTTSStartEvent
  | PipelineTTSEndEvent;

export type PipelineRunOptions = (
  | {
      start_stage: "intent" | "tts";
      input: { text: string };
    }
  | {
      start_stage: "stt";
      input: { sample_rate: number };
    }
  | {
      start_stage: "wake_word";
      input: {
        sample_rate: number;
        timeout?: number;
        audio_seconds_to_buffer?: number;
      };
    }
) & {
  end_stage: "stt" | "intent" | "tts";
  pipeline?: string;
  conversation_id?: string | null;
};

export interface PipelineRun {
  init_options?: PipelineRunOptions;
  events: PipelineRunEvent[];
  stage: "ready" | "wake_word" | "stt" | "intent" | "tts" | "done" | "error";
  run: PipelineRunStartEvent["data"];
  error?: PipelineErrorEvent["data"];
  started: Date;
  finished?: Date;
  wake_word?: PipelineWakeWordStartEvent["data"] &
    Partial<PipelineWakeWordEndEvent["data"]> & { done: boolean };
  stt?: PipelineSTTStartEvent["data"] &
    Partial<PipelineSTTEndEvent["data"]> & { done: boolean };
  intent?: PipelineIntentStartEvent["data"] &
    Partial<PipelineIntentEndEvent["data"]> & { done: boolean };
  tts?: PipelineTTSStartEvent["data"] &
    Partial<PipelineTTSEndEvent["data"]> & { done: boolean };
}

export const processEvent = (
  run: PipelineRun | undefined,
  event: PipelineRunEvent,
  options?: PipelineRunOptions
): PipelineRun | undefined => {
  if (event.type === "run-start") {
    run = {
      init_options: options,
      stage: "ready",
      run: event.data,
      events: [event],
      started: new Date(event.timestamp),
    };
    return run;
  }

  if (!run) {
    // eslint-disable-next-line no-console
    console.warn("Received unexpected event before receiving session", event);
    return undefined;
  }

  if (event.type === "wake_word-start") {
    run = {
      ...run,
      stage: "wake_word",
      wake_word: { ...event.data, done: false },
    };
  } else if (event.type === "wake_word-end") {
    run = {
      ...run,
      wake_word: { ...run.wake_word!, ...event.data, done: true },
    };
  } else if (event.type === "stt-start") {
    run = {
      ...run,
      stage: "stt",
      stt: { ...event.data, done: false },
    };
  } else if (event.type === "stt-end") {
    run = {
      ...run,
      stt: { ...run.stt!, ...event.data, done: true },
    };
  } else if (event.type === "intent-start") {
    run = {
      ...run,
      stage: "intent",
      intent: { ...event.data, done: false },
    };
  } else if (event.type === "intent-end") {
    run = {
      ...run,
      intent: { ...run.intent!, ...event.data, done: true },
    };
  } else if (event.type === "tts-start") {
    run = {
      ...run,
      stage: "tts",
      tts: { ...event.data, done: false },
    };
  } else if (event.type === "tts-end") {
    run = {
      ...run,
      tts: { ...run.tts!, ...event.data, done: true },
    };
  } else if (event.type === "run-end") {
    run = { ...run, finished: new Date(event.timestamp), stage: "done" };
  } else if (event.type === "error") {
    run = {
      ...run,
      finished: new Date(event.timestamp),
      stage: "error",
      error: event.data,
    };
  } else {
    run = { ...run };
  }

  run.events = [...run.events, event];

  return run;
};

export const runDebugAssistPipeline = (
  hass: HomeAssistant,
  callback: (run: PipelineRun) => void,
  options: PipelineRunOptions
) => {
  let run: PipelineRun | undefined;

  const unsubProm = runAssistPipeline(
    hass,
    (updateEvent) => {
      run = processEvent(run, updateEvent, options);

      if (updateEvent.type === "run-end" || updateEvent.type === "error") {
        unsubProm.then((unsub) => unsub());
      }

      if (run) {
        callback(run);
      }
    },
    options
  );

  return unsubProm;
};

export const runAssistPipeline = (
  hass: Pick<HomeAssistant, "connection">,
  callback: (event: PipelineRunEvent) => void,
  options: PipelineRunOptions
) =>
  hass.connection.subscribeMessage<PipelineRunEvent>(callback, {
    ...options,
    type: "assist_pipeline/run",
  });

export const listAssistPipelineRuns = (
  hass: HomeAssistant,
  pipeline_id: string
) =>
  hass.callWS<{
    pipeline_runs: AssistRunListing[];
  }>({
    type: "assist_pipeline/pipeline_debug/list",
    pipeline_id,
  });

export const getAssistPipelineRun = (
  hass: HomeAssistant,
  pipeline_id: string,
  pipeline_run_id: string
) =>
  hass.callWS<{
    events: PipelineRunEvent[];
  }>({
    type: "assist_pipeline/pipeline_debug/get",
    pipeline_id,
    pipeline_run_id,
  });

export const listAssistPipelines = (hass: HomeAssistant) =>
  hass.callWS<{
    pipelines: AssistPipeline[];
    preferred_pipeline: string | null;
  }>({
    type: "assist_pipeline/pipeline/list",
  });

export const getAssistPipeline = (
  hass: Pick<HomeAssistant, "callWS">,
  pipeline_id?: string
) =>
  hass.callWS<AssistPipeline>({
    type: "assist_pipeline/pipeline/get",
    pipeline_id,
  });

export const createAssistPipeline = (
  hass: HomeAssistant,
  pipeline: AssistPipelineMutableParams
) =>
  hass.callWS<AssistPipeline>({
    type: "assist_pipeline/pipeline/create",
    ...pipeline,
  });

export const updateAssistPipeline = (
  hass: HomeAssistant,
  pipeline_id: string,
  pipeline: AssistPipelineMutableParams
) =>
  hass.callWS<AssistPipeline>({
    type: "assist_pipeline/pipeline/update",
    pipeline_id,
    ...pipeline,
  });

export const setAssistPipelinePreferred = (
  hass: HomeAssistant,
  pipeline_id: string
) =>
  hass.callWS({
    type: "assist_pipeline/pipeline/set_preferred",
    pipeline_id,
  });

export const deleteAssistPipeline = (hass: HomeAssistant, pipelineId: string) =>
  hass.callWS<undefined>({
    type: "assist_pipeline/pipeline/delete",
    pipeline_id: pipelineId,
  });

export const fetchAssistPipelineLanguages = (hass: HomeAssistant) =>
  hass.callWS<{ languages: string[] | null }>({
    type: "assist_pipeline/language/list",
  });

export const listAssistDevices = (hass: HomeAssistant) =>
  hass.callWS<AssistDevice[]>({
    type: "assist_pipeline/device/list",
  });
