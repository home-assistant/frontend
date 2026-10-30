import { describe, expect, it, vi } from "vitest";
import {
  createAssistMessageProcessor,
  type AssistMessage,
} from "../../src/data/assist_chat";
import type {
  ConversationChatLogAssistantDelta,
  PipelineRunEvent,
} from "../../src/data/assist_pipeline";

const assistantDelta = (
  delta: Partial<ConversationChatLogAssistantDelta>
): PipelineRunEvent => ({
  type: "intent-progress",
  timestamp: "2026-09-21T00:00:00.000Z",
  data: { chat_log_delta: delta },
});

const toolCall = {
  id: "call-1",
  tool_name: "get_weather",
  tool_args: {},
  external: false,
};

const toolResultDelta: PipelineRunEvent = {
  type: "intent-progress",
  timestamp: "2026-09-21T00:00:01.000Z",
  data: {
    chat_log_delta: {
      role: "tool_result",
      agent_id: "agent",
      tool_call_id: "call-1",
      tool_name: "get_weather",
      result: { data: { temperature: "21 °C" }, error: false },
      created: "2026-09-21T00:00:01.000Z",
    },
  },
};

const intentEnd = (speech?: string): PipelineRunEvent => ({
  type: "intent-end",
  timestamp: "2026-09-21T00:00:02.000Z",
  data: {
    processed_locally: false,
    intent_output: {
      conversation_id: "conversation-id",
      response: {
        language: "en",
        response_type: "query_answer",
        speech:
          speech === undefined
            ? {}
            : {
                plain: { extra_data: {}, speech },
                ssml: { extra_data: {}, speech },
              },
        data: { success: [], failed: [] },
      },
      continue_conversation: false,
    },
  },
});

const createProcessor = (added: AssistMessage[] = []) =>
  createAssistMessageProcessor({
    addMessage: (message) => added.push(message),
    requestUpdate: vi.fn(),
  });

describe("createAssistMessageProcessor", () => {
  it("keeps the beginning of a reply that contains tool calls", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({
        role: "assistant",
        content: "Let me check the weather for you.",
      })
    );
    processor.processEvent(assistantDelta({ tool_calls: [toolCall] }));
    processor.processEvent(toolResultDelta);
    processor.processEvent(
      assistantDelta({
        role: "assistant",
        content: "It is 21 degrees in Utrecht.",
      })
    );
    processor.processEvent(intentEnd("It is 21 degrees in Utrecht."));

    expect(processor.hassMessage.text).toBe(
      "Let me check the weather for you.\n\nIt is 21 degrees in Utrecht."
    );
  });

  it("does not duplicate a reply that was fully streamed", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "The lights " })
    );
    processor.processEvent(assistantDelta({ content: "are on." }));
    processor.processEvent(intentEnd("The lights are on."));

    expect(processor.hassMessage.text).toBe("The lights are on.");
  });

  it("uses the response when nothing was streamed", () => {
    const processor = createProcessor();
    processor.processEvent(intentEnd("The lights are on."));

    expect(processor.hassMessage.text).toBe("The lights are on.");
  });

  it("keeps a message boundary when role and content arrive separately", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "Let me check." })
    );
    processor.processEvent(assistantDelta({ role: "assistant" }));
    processor.processEvent(assistantDelta({ content: "Done." }));
    processor.processEvent(intentEnd("Done."));

    expect(processor.hassMessage.text).toBe("Let me check.\n\nDone.");
  });

  it("removes the streaming ellipsis when there is no spoken response", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "Done." })
    );
    processor.processEvent(intentEnd());

    expect(processor.hassMessage.text).toBe("Done.");
  });

  it("keeps streamed content and adds the error as its own message", () => {
    const added: AssistMessage[] = [];
    const processor = createProcessor(added);
    processor.addMessage();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "Checking the sensor." })
    );

    processor.setError("Timeout running pipeline");

    expect(added).toHaveLength(2);
    expect(added[0].text).toBe("Checking the sensor.");
    expect(added[1].text).toBe("Timeout running pipeline");
    expect(added[1].error).toBe(true);
  });
});
