import { describe, expect, it, vi } from "vitest";
import type { AssistPipeline } from "../../src/data/assist_pipeline";
import {
  assistPipelineChanged,
  greetingTranslationLanguage,
  initialPromptToSubmit,
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
