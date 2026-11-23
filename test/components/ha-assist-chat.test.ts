import { ContextProvider } from "@lit/context";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AssistPipeline } from "../../src/data/assist_pipeline";
import type { AssistMessage } from "../../src/data/assist_chat";
import {
  internationalizationContext,
  statesContext,
} from "../../src/data/context";
import type { HomeAssistantInternationalization } from "../../src/types";
import {
  assistPipelineChanged,
  greetingTranslationLanguage,
  initialPromptToSubmit,
} from "../../src/components/ha-assist-chat";
import type { HaAssistChat } from "../../src/components/ha-assist-chat";

// common-translation depends on build-time defines and generated translation
// metadata that are not available in unit tests.
vi.mock("../../src/util/common-translation", () => ({
  findAvailableLanguage: (language: string) =>
    ({ en: "en", "en-US": "en", nl: "nl", pl: "pl", zh: "zh-Hant" })[language],
  getTranslation: vi.fn(),
}));

// jsdom has no Worker, which the markdown renderer needs.
vi.mock("../../src/components/ha-markdown", () => ({}));

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

  // "zh" resolves to Traditional Chinese, which greeted Simplified Chinese
  // users in the wrong script (#54736)
  it("returns undefined when the interface uses a variant of the pipeline language", () => {
    expect(greetingTranslationLanguage("zh", "zh-Hans")).toBeUndefined();
  });

  it("still translates a bare pipeline language for another interface language", () => {
    expect(greetingTranslationLanguage("zh", "en")).toBe("zh-Hant");
  });
});

describe("ha-assist-chat scrolling", () => {
  // jsdom lacks scrollIntoView and the validity API of form controls
  const internalsProto = window.ElementInternals.prototype as any;
  const patched: [object, string][] = [
    [internalsProto, "setValidity"],
    [internalsProto, "setFormValue"],
    [internalsProto, "validity"],
    [Element.prototype, "scrollIntoView"],
  ];
  const originals = patched.map(([target, key]) =>
    Object.getOwnPropertyDescriptor(target, key)
  );
  const scrolled: Element[] = [];
  let host: HTMLElement | undefined;

  beforeAll(() => {
    internalsProto.setValidity = vi.fn();
    internalsProto.setFormValue = vi.fn();
    Object.defineProperty(internalsProto, "validity", {
      get: () => ({ valid: true }),
      configurable: true,
    });
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
  });

  afterEach(() => {
    host?.remove();
    host = undefined;
    scrolled.length = 0;
  });

  afterAll(() => {
    patched.forEach(([target, key], i) => {
      if (originals[i]) {
        Object.defineProperty(target, key, originals[i]);
      } else {
        delete (target as Record<string, unknown>)[key];
      }
    });
  });

  // Each message sits in its own container, so a ".message:last-child"
  // selector matched the greeting and scrolled to the top (#51873)
  it("scrolls to the newest message", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    new ContextProvider(host, {
      context: internationalizationContext,
      initialValue: {
        localize: (key: string) => key,
        language: "en",
      } as unknown as HomeAssistantInternationalization,
    });
    new ContextProvider(host, { context: statesContext, initialValue: {} });
    const el = document.createElement("ha-assist-chat") as HaAssistChat;
    // jsdom has no layout; put the top of the chat above the messages so
    // they count as not yet scrolled into view
    el.getBoundingClientRect = () => ({ top: -100 }) as DOMRect;
    host.appendChild(el);
    await el.updateComplete;

    const message = (text: string): AssistMessage => ({
      who: "user",
      text,
      thinking: "",
      tool_calls: {},
    });
    Object.assign(el, {
      _conversation: [message("first"), message("second"), message("third")],
    });
    await el.updateComplete;
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const messages = el.shadowRoot!.querySelectorAll(".message");
    expect(messages).toHaveLength(3);
    expect([...messages].indexOf(scrolled[scrolled.length - 1])).toBe(2);
  });
});
