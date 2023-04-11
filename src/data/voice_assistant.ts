import type { HomeAssistant } from "../types";
import type { ConversationResult } from "./conversation";
import type { ResolvedMediaSource } from "./media_source";
import type { SpeechMetadata } from "./stt";

interface PipelineEventBase {
  timestamp: string;
}

interface PipelineRunStartEvent extends PipelineEventBase {
  type: "run-start";
  data: {
    pipeline: string;
    language: string;
    runner_data: {
      stt_binary_handler_id: number | null;
      timeout: number;
    };
  };
}
interface PipelineRunEndEvent extends PipelineEventBase {
  type: "run-end";
  data: Record<string, never>;
}

interface PipelineErrorEvent extends PipelineEventBase {
  type: "error";
  data: {
    code: string;
    message: string;
  };
}

interface PipelineSTTStartEvent extends PipelineEventBase {
  type: "stt-start";
  data: {
    engine: string;
    metadata: SpeechMetadata;
  };
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
    intent_input: string;
  };
}
interface PipelineIntentEndEvent extends PipelineEventBase {
  type: "intent-end";
  data: {
    intent_output: ConversationResult;
  };
}

interface PipelineTTSStartEvent extends PipelineEventBase {
  type: "tts-start";
  data: {
    engine: string;
    tts_input: string;
  };
}
interface PipelineTTSEndEvent extends PipelineEventBase {
  type: "tts-end";
  data: {
    tts_output: ResolvedMediaSource;
  };
}

type PipelineRunEvent =
  | PipelineRunStartEvent
  | PipelineRunEndEvent
  | PipelineErrorEvent
  | PipelineSTTStartEvent
  | PipelineSTTEndEvent
  | PipelineIntentStartEvent
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
) & {
  end_stage: "stt" | "intent" | "tts";
  language?: string;
  pipeline?: string;
  conversation_id?: string | null;
};

export interface PipelineRun {
  init_options: PipelineRunOptions;
  events: PipelineRunEvent[];
  stage: "ready" | "stt" | "intent" | "tts" | "done" | "error";
  run: PipelineRunStartEvent["data"];
  error?: PipelineErrorEvent["data"];
  stt?: PipelineSTTStartEvent["data"] &
    Partial<PipelineSTTEndEvent["data"]> & { done: boolean };
  intent?: PipelineIntentStartEvent["data"] &
    Partial<PipelineIntentEndEvent["data"]> & { done: boolean };
  tts?: PipelineTTSStartEvent["data"] &
    Partial<PipelineTTSEndEvent["data"]> & { done: boolean };
}

export const runVoiceAssistantPipeline = (
  hass: HomeAssistant,
  callback: (event: PipelineRun) => void,
  options: PipelineRunOptions
) => {
  let run: PipelineRun | undefined;

  const unsubProm = hass.connection.subscribeMessage<PipelineRunEvent>(
    (updateEvent) => {
      if (updateEvent.type === "run-start") {
        run = {
          init_options: options,
          stage: "ready",
          run: updateEvent.data,
          error: undefined,
          stt: undefined,
          intent: undefined,
          tts: undefined,
          events: [updateEvent],
        };
        callback(run);
        return;
      }

      if (!run) {
        // eslint-disable-next-line no-console
        console.warn(
          "Received unexpected event before receiving session",
          updateEvent
        );
        return;
      }

      if (updateEvent.type === "stt-start") {
        run = {
          ...run,
          stage: "stt",
          stt: { ...updateEvent.data, done: false },
        };
      } else if (updateEvent.type === "stt-end") {
        run = {
          ...run,
          stt: { ...run.stt!, ...updateEvent.data, done: true },
        };
      } else if (updateEvent.type === "intent-start") {
        run = {
          ...run,
          stage: "intent",
          intent: { ...updateEvent.data, done: false },
        };
      } else if (updateEvent.type === "intent-end") {
        run = {
          ...run,
          intent: { ...run.intent!, ...updateEvent.data, done: true },
        };
      } else if (updateEvent.type === "tts-start") {
        run = {
          ...run,
          stage: "tts",
          tts: { ...updateEvent.data, done: false },
        };
      } else if (updateEvent.type === "tts-end") {
        run = {
          ...run,
          tts: { ...run.tts!, ...updateEvent.data, done: true },
        };
      } else if (updateEvent.type === "run-end") {
        run = { ...run, stage: "done" };
        unsubProm.then((unsub) => unsub());
      } else if (updateEvent.type === "error") {
        run = { ...run, stage: "error", error: updateEvent.data };
        unsubProm.then((unsub) => unsub());
      } else {
        run = { ...run };
      }

      run.events = [...run.events, updateEvent];

      callback(run);
    },
    {
      ...options,
      type: "voice_assistant/run",
    }
  );

  return unsubProm;
};
