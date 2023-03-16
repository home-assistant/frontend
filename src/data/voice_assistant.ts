import { HomeAssistant } from "../types";
import { ConversationResult } from "./conversation";

interface PipelineEventBase {
  timestamp: number;
}

interface PipelineRunStartEvent extends PipelineEventBase {
  type: "run-start";
  data: {
    pipeline: string;
    language: string;
    session_id?: string;
  };
}
interface PipelineRunFinishEvent extends PipelineEventBase {
  type: "run-finish";
  data: {
    url: string;
  };
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
  };
}
interface PipelineSTTFinishEvent extends PipelineEventBase {
  type: "stt-finish";
  data: {
    text: string;
  };
}

interface PipelineIntentStartEvent extends PipelineEventBase {
  type: "intent-start";
  data: {
    agent_id: string;
  };
}
interface PipelineIntentFinishEvent extends PipelineEventBase {
  type: "intent-finish";
  data: {
    speech: string;
    response: ConversationResult;
  };
}

interface PipelineTTSStartEvent extends PipelineEventBase {
  type: "tts-start";
  data: {
    engine: string;
  };
}
interface PipelineTTSFinishEvent extends PipelineEventBase {
  type: "tts-finish";
  data: {
    url: string;
  };
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
  stt_text?: string;
  conversation_id?: string | null;
}

export interface PipelineRun {
  init_options: PipelineRunOptions;
  events: PipelineRunEvent[];
  stage: "initialized" | "stt" | "intent" | "tts" | "finish" | "error";
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
          stage: "initialized",
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
        run.stage = "stt";
        run.stt = updateEvent.data;
      } else if (updateEvent.type === "stt-finish") {
        run.stt = { ...run.stt!, ...updateEvent.data };
      } else if (updateEvent.type === "intent-start") {
        run.stage = "intent";
        run.intent = updateEvent.data;
      } else if (updateEvent.type === "intent-finish") {
        run.intent = { ...run.intent!, ...updateEvent.data };
      } else if (updateEvent.type === "tts-start") {
        run.stage = "tts";
        run.tts = updateEvent.data;
      } else if (updateEvent.type === "tts-finish") {
        run.tts = { ...run.tts!, ...updateEvent.data };
      } else if (updateEvent.type === "run-finish") {
        run.stage = "finish";
        unsubProm.then((unsub) => unsub());
      } else if (updateEvent.type === "error") {
        run.stage = "error";
        run.error = updateEvent.data;
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
