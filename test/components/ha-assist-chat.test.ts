import { describe, expect, it, vi } from "vitest";
import type {
  AssistPipeline,
  ConversationChatLogAssistantDelta,
  PipelineRunEvent,
} from "../../src/data/assist_pipeline";
import type { ChatLogToolResult } from "../../src/data/chat_log";
import {
  assistPipelineChanged,
  createAssistMessageProcessor,
  greetingTranslationLanguage,
  initialPromptToSubmit,
  type AssistMessage,
} from "../../src/components/ha-assist-chat";

// common-translation depends on build-time defines and generated translation
// metadata that are not available in unit tests.
vi.mock("../../src/util/common-translation", () => ({
  findAvailableLanguage: (language: string) =>
    ({ en: "en", "en-US": "en", nl: "nl", pl: "pl" })[language],
  getTranslation: vi.fn(),
}));

describe("initialPromptToSubmit", () => {
  it("returns a trimmed prompt when submission is requested", () => {
    expect(initialPromptToSubmit("  Turn on the lights  ", true)).toBe(
      "Turn on the lights"
    );
  });

  it("does not return a prompt when submission is not requested", () => {
    expect(initialPromptToSubmit("Turn on the lights", false)).toBeUndefined();
  });

  it("does not return an empty prompt", () => {
    expect(initialPromptToSubmit("   ", true)).toBeUndefined();
  });
});

describe("ha-assist-chat pipeline updates", () => {
  it("preserves the conversation when the same pipeline is reloaded", () => {
    const pipeline = { id: "pipeline-id" } as AssistPipeline;
    expect(assistPipelineChanged(pipeline, { ...pipeline })).toBe(false);
  });

  it("resets the conversation when the pipeline changes", () => {
    expect(
      assistPipelineChanged(
        { id: "first" } as AssistPipeline,
        { id: "second" } as AssistPipeline
      )
    ).toBe(true);
  });
});

describe("greetingTranslationLanguage", () => {
  it("returns the pipeline language when it differs from the interface language", () => {
    expect(greetingTranslationLanguage("pl", "en")).toBe("pl");
  });

  it("returns undefined when the pipeline language matches the interface language", () => {
    expect(greetingTranslationLanguage("nl", "nl")).toBeUndefined();
  });

  it("returns undefined when the pipeline language resolves to the interface language", () => {
    expect(greetingTranslationLanguage("en-US", "en")).toBeUndefined();
  });

  it("returns undefined when there is no pipeline language", () => {
    expect(greetingTranslationLanguage(undefined, "en")).toBeUndefined();
  });

  it("returns undefined when the pipeline language has no available translation", () => {
    expect(greetingTranslationLanguage("xx", "en")).toBeUndefined();
  });
});

const assistantDelta = (
  delta: Partial<ConversationChatLogAssistantDelta>
): PipelineRunEvent => ({
  type: "intent-progress",
  timestamp: "2026-09-21T00:00:00.000Z",
  data: { chat_log_delta: delta },
});

const toolResultDelta = (
  toolCallId: string,
  result: ChatLogToolResult
): PipelineRunEvent => ({
  type: "intent-progress",
  timestamp: "2026-09-21T00:00:01.000Z",
  data: {
    chat_log_delta: {
      role: "tool_result",
      agent_id: "agent",
      tool_call_id: toolCallId,
      tool_name: "get_weather",
      result,
      created: "2026-09-21T00:00:01.000Z",
    },
  },
});

const intentEnd = (
  speech?: string,
  continueConversation = false
): PipelineRunEvent => ({
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
            ? null
            : {
                plain: { extra_data: {}, speech },
                ssml: { extra_data: {}, speech },
              },
        data: { targets: [], success: [], failed: [] },
      },
      continue_conversation: continueConversation,
    },
  },
});

describe("createAssistMessageProcessor", () => {
  const createProcessor = (added: AssistMessage[] = []) =>
    createAssistMessageProcessor({
      addMessage: (message) => added.push(message),
      requestUpdate: vi.fn(),
    });

  it("keeps the beginning of a reply that contains tool calls", () => {
    const processor = createProcessor();
    processor.addMessage();
    processor.processEvent(
      assistantDelta({
        role: "assistant",
        content: "Let me check the weather for you.",
      })
    );
    processor.processEvent(
      assistantDelta({
        tool_calls: [
          {
            id: "call-1",
            tool_name: "get_weather",
            tool_args: { city: "Utrecht" },
          },
        ],
      })
    );
    processor.processEvent(
      toolResultDelta("call-1", {
        data: { temperature: "21 °C" },
        error: false,
      })
    );
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
    expect(Object.keys(processor.hassMessage.tool_calls)).toEqual(["call-1"]);
    expect(processor.hassMessage.tool_calls["call-1"].result).toEqual({
      data: { temperature: "21 °C" },
      error: false,
    });
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

  it("fills in the reply when only tool calls were streamed", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({
        role: "assistant",
        tool_calls: [
          {
            id: "call-1",
            tool_name: "get_weather",
            tool_args: { city: "Utrecht" },
          },
        ],
      })
    );
    processor.processEvent(
      toolResultDelta("call-1", {
        data: { temperature: "21 °C" },
        error: false,
      })
    );
    processor.processEvent(intentEnd("It is 21 degrees in Utrecht."));

    expect(processor.hassMessage.text).toBe("It is 21 degrees in Utrecht.");
    expect(Object.keys(processor.hassMessage.tool_calls)).toEqual(["call-1"]);
  });

  it("removes the streaming ellipsis when the reply has no spoken response", () => {
    const processor = createProcessor();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "Done." })
    );
    processor.processEvent(intentEnd());

    expect(processor.hassMessage.text).toBe("Done.");
  });

  it("tracks the continue conversation flag from the intent output", () => {
    const processor = createProcessor();
    expect(processor.continueConversation).toBe(false);
    processor.processEvent(intentEnd("Ok.", true));

    expect(processor.continueConversation).toBe(true);
  });

  it("keeps streamed content and adds the error as a new message", () => {
    const added: AssistMessage[] = [];
    const processor = createProcessor(added);
    processor.addMessage();
    processor.processEvent(
      assistantDelta({ role: "assistant", content: "Checking the sensor." })
    );
    processor.processEvent(
      assistantDelta({
        tool_calls: [
          { id: "call-1", tool_name: "get_sensor_state", tool_args: {} },
        ],
      })
    );

    processor.setError("Timeout running pipeline");

    expect(added).toHaveLength(2);
    expect(added[0].text).toBe("Checking the sensor.");
    expect(processor.hassMessage).toBe(added[1]);
    expect(added[1].text).toBe("Timeout running pipeline");
    expect(added[1].error).toBe(true);
  });

  it("sets the error on the placeholder when nothing was streamed", () => {
    const added: AssistMessage[] = [];
    const processor = createProcessor(added);
    processor.addMessage();

    processor.setError("Pipeline failed");

    expect(added).toHaveLength(1);
    expect(added[0].text).toBe("Pipeline failed");
    expect(added[0].error).toBe(true);
  });
});
