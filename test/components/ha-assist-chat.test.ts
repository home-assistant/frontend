import { describe, expect, it } from "vitest";
import type { AssistPipeline } from "../../src/data/assist_pipeline";
import {
  assistPipelineChanged,
  initialPromptToSubmit,
} from "../../src/components/ha-assist-chat";

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
