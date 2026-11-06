import type {
  ConversationChatLogAssistantDelta,
  ConversationChatLogToolResultDelta,
  PipelineRunEvent,
} from "./assist_pipeline";
import type { ChatLogToolResult } from "./chat_log";

export interface AssistMessage {
  who: string;
  text: string;
  thinking: string;
  thinking_expanded?: boolean;
  tool_calls: Record<
    string,
    {
      tool_name: string;
      tool_args: Record<string, unknown>;
      result?: ChatLogToolResult;
    }
  >;
  error?: boolean;
}

export interface AssistMessageProcessor {
  readonly continueConversation: boolean;
  readonly hassMessage: AssistMessage;
  addMessage: () => void;
  setError: (error: string) => void;
  processEvent: (event: PipelineRunEvent) => void;
}

type ChatLogDelta =
  | Partial<ConversationChatLogAssistantDelta>
  | ConversationChatLogToolResultDelta;

const STREAMING_ELLIPSIS = "…";

const stripStreamingEllipsis = (text: string): string =>
  text.endsWith(STREAMING_ELLIPSIS) ? text.slice(0, -1) : text;

const joinWithBreak = (previous: string, next: string): string => {
  if (previous === "" || next === "") {
    return previous + next;
  }
  if (
    /\r?\n\r?\n$/.test(previous) ||
    /^\r?\n\r?\n/.test(next) ||
    (/\r?\n$/.test(previous) && /^\r?\n/.test(next))
  ) {
    return previous + next;
  }
  return /\r?\n$/.test(previous) || /^\r?\n/.test(next)
    ? `${previous}\n${next}`
    : `${previous}\n\n${next}`;
};

const newAssistantMessage = (): AssistMessage => ({
  who: "hass",
  text: STREAMING_ELLIPSIS,
  thinking: "",
  tool_calls: {},
  error: false,
});

export const createAssistMessageProcessor = ({
  addMessage,
  requestUpdate,
}: {
  addMessage: (message: AssistMessage) => void;
  requestUpdate: () => void;
}): AssistMessageProcessor => {
  let currentDeltaRole = "";
  // The role and the content of a new message can arrive in separate deltas.
  let pendingMessageBoundary = false;
  // Once finalized, a trailing ellipsis is part of the reply and is kept.
  let streamingMarker = true;
  let latestSegment = "";
  let continueConversation = false;
  let hassMessage: AssistMessage = newAssistantMessage();

  const isMessageEmpty = (message: AssistMessage) =>
    streamingMarker &&
    message.text === STREAMING_ELLIPSIS &&
    !message.thinking &&
    Object.keys(message.tool_calls).length === 0;

  const finalizeStreamingText = () => {
    if (streamingMarker) {
      hassMessage.text = stripStreamingEllipsis(hassMessage.text);
    }
    streamingMarker = false;
  };

  const progressToNextMessage = () => {
    if (isMessageEmpty(hassMessage)) {
      return;
    }
    finalizeStreamingText();
    hassMessage = newAssistantMessage();
    streamingMarker = true;
    latestSegment = "";
    addMessage(hassMessage);
  };

  const isAssistantDelta = (
    _delta: ChatLogDelta
  ): _delta is Partial<ConversationChatLogAssistantDelta> =>
    currentDeltaRole === "assistant";

  const isToolResultDelta = (
    _delta: ChatLogDelta
  ): _delta is ConversationChatLogToolResultDelta =>
    currentDeltaRole === "tool_result";

  // The response speech only contains the final assistant message, so merge
  // it into the streamed text instead of replacing it.
  const applyFinalResponse = (response: string) => {
    finalizeStreamingText();
    const streamed = hassMessage.text;
    if (streamed === "") {
      hassMessage.text = response;
    } else if (latestSegment.trim() !== response.trim()) {
      hassMessage.text = joinWithBreak(streamed, response);
    }
  };

  const setError = (error: string) => {
    progressToNextMessage();
    hassMessage.text = error;
    hassMessage.error = true;
    streamingMarker = false;
    requestUpdate();
  };

  const processEvent = (event: PipelineRunEvent) => {
    if (event.type === "intent-progress" && event.data.chat_log_delta) {
      const delta = event.data.chat_log_delta;

      // new message
      if (delta.role) {
        currentDeltaRole = delta.role;
        if (delta.role === "assistant") {
          pendingMessageBoundary = true;
          latestSegment = "";
        }
      }

      if (isAssistantDelta(delta)) {
        if (delta.content) {
          let text = stripStreamingEllipsis(hassMessage.text);
          if (pendingMessageBoundary) {
            text = joinWithBreak(text, delta.content);
            pendingMessageBoundary = false;
          } else {
            text += delta.content;
          }
          latestSegment += delta.content;
          hassMessage.text = text + STREAMING_ELLIPSIS;
          streamingMarker = true;
        }
        if (delta.thinking_content) {
          hassMessage.thinking += delta.thinking_content;
        }
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            hassMessage.tool_calls[toolCall.id] = toolCall;
          }
        }
        requestUpdate();
      } else if (isToolResultDelta(delta)) {
        if (hassMessage.tool_calls[delta.tool_call_id]) {
          hassMessage.tool_calls[delta.tool_call_id].result = delta.result;
          requestUpdate();
        }
      }
    } else if (event.type === "intent-end") {
      continueConversation = event.data.intent_output.continue_conversation;
      const response = event.data.intent_output.response.speech.plain?.speech;
      if (
        event.data.intent_output.response.response_type === "error" &&
        response
      ) {
        setError(response);
        return;
      }
      if (response) {
        applyFinalResponse(response);
      } else {
        finalizeStreamingText();
      }
      pendingMessageBoundary = false;
      requestUpdate();
    }
  };

  return {
    get continueConversation() {
      return continueConversation;
    },
    get hassMessage() {
      return hassMessage;
    },
    addMessage: () => {
      addMessage(hassMessage);
    },
    setError,
    processEvent,
  };
};
