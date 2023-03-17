import { HomeAssistant } from "../types";
import { ConversationResult } from "./conversation";

interface PipelineEventBase {
  timestamp: string;
}

interface PipelineRunStartEvent extends PipelineEventBase {
  type: "run-start";
  data: {
    pipeline: string;
    language: string;
  };
}
interface PipelineRunFinishEvent extends PipelineEventBase {
  type: "run-finish";
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
  data: Record<string, never>;
}
interface PipelineSTTFinishEvent extends PipelineEventBase {
  type: "stt-finish";
  data: Record<string, never>;
}

interface PipelineIntentStartEvent extends PipelineEventBase {
  type: "intent-start";
  data: {
    engine: string;
    intent_input: string;
  };
}
interface PipelineIntentFinishEvent extends PipelineEventBase {
  type: "intent-finish";
  data: {
    intent_output: ConversationResult;
  };
}

interface PipelineTTSStartEvent extends PipelineEventBase {
  type: "tts-start";
  data: Record<string, never>;
}
interface PipelineTTSFinishEvent extends PipelineEventBase {
  type: "tts-finish";
  data: Record<string, never>;
}

type PipelineRunEvent =
  | PipelineRunStartEvent
  | PipelineRunFinishEvent
  | PipelineErrorEvent
  | PipelineSTTStartEvent
  | PipelineSTTFinishEvent
  | PipelineIntentStartEvent
  | PipelineIntentFinishEvent
  | PipelineTTSStartEvent
  | PipelineTTSFinishEvent;

interface PipelineRunOptions {
  pipeline?: string;
  intent_input?: string;
  conversation_id?: string | null;
}

export interface PipelineRun {
  init_options: PipelineRunOptions;
  events: PipelineRunEvent[];
  stage: "ready" | "stt" | "intent" | "tts" | "done" | "error";
  run: PipelineRunStartEvent["data"];
  error?: PipelineErrorEvent["data"];
  stt?: PipelineSTTStartEvent["data"] & Partial<PipelineSTTFinishEvent["data"]>;
  intent?: PipelineIntentStartEvent["data"] &
    Partial<PipelineIntentFinishEvent["data"]>;
  tts?: PipelineTTSStartEvent["data"] & Partial<PipelineTTSFinishEvent["data"]>;
}

export const runPipelineFromText = (
  hass: HomeAssistant,
  callback: (event: PipelineRun) => void,
  options: PipelineRunOptions = {}
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

      run.events.push(updateEvent);

      if (updateEvent.type === "stt-start") {
        run = { ...run, stage: "stt", stt: updateEvent.data };
      } else if (updateEvent.type === "stt-finish") {
        run = { ...run, stt: { ...run.stt!, ...updateEvent.data } };
      } else if (updateEvent.type === "intent-start") {
        run = { ...run, stage: "intent", intent: updateEvent.data };
      } else if (updateEvent.type === "intent-finish") {
        run = { ...run, intent: { ...run.intent!, ...updateEvent.data } };
      } else if (updateEvent.type === "tts-start") {
        run = { ...run, stage: "tts", tts: updateEvent.data };
      } else if (updateEvent.type === "tts-finish") {
        run = { ...run, tts: { ...run.tts!, ...updateEvent.data } };
      } else if (updateEvent.type === "run-finish") {
        run = { ...run, stage: "done" };
        unsubProm.then((unsub) => unsub());
      } else if (updateEvent.type === "error") {
        run = { ...run, stage: "error", error: updateEvent.data };
        unsubProm.then((unsub) => unsub());
      }

      callback(run);
    },
    {
      ...options,
      type: "voice_assistant/run",
    }
  );

  return unsubProm;
};
