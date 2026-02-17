import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchHighlight } from "../../../src/common/string/search-highlight";

interface MockHighlightApi {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

const originalCSS = globalThis.CSS;
const originalHighlight = globalThis.Highlight;

const createShadowRoot = () => {
  const host = document.createElement("div");
  document.body.append(host);
  return { host, root: host.attachShadow({ mode: "open" }) };
};

const flushMutationObserver = async () => {
  await Promise.resolve();
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const installMockCustomHighlights = (): MockHighlightApi => {
  const highlights: MockHighlightApi = {
    set: vi.fn(),
    delete: vi.fn(),
  };

  class MockHighlight {
    public ranges: Range[];

    public constructor(...ranges: Range[]) {
      this.ranges = ranges;
    }
  }

  (globalThis as any).CSS = { highlights };
  (globalThis as any).Highlight = MockHighlight;

  return highlights;
};

describe("search highlight text rendering", () => {
  let searchHighlight: SearchHighlight;

  beforeEach(() => {
    searchHighlight = new SearchHighlight();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns substring ranges", () => {
    expect(searchHighlight.getHighlightRanges("Hello World", "lo")).toEqual([
      { start: 3, end: 5 },
    ]);
  });

  it("returns empty ranges for empty text or query", () => {
    expect(searchHighlight.getHighlightRanges("", "hello")).toEqual([]);
    expect(searchHighlight.getHighlightRanges("hello", "")).toEqual([]);
  });

  it("matches diacritics-insensitive", () => {
    expect(searchHighlight.getHighlightRanges("Café", "cafe")).toEqual([
      { start: 0, end: 4 },
    ]);
  });

  it("deduplicates repeated search terms", () => {
    expect(
      searchHighlight.getHighlightRanges("alpha alpha", "alpha alpha")
    ).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 11 },
    ]);
  });

  it("maps matches to original indexes for multi-unit characters", () => {
    expect(searchHighlight.getHighlightRanges("A😀B", "😀")).toEqual([
      { start: 1, end: 4 },
    ]);
  });

  it("merges overlapping and adjacent ranges", () => {
    expect(searchHighlight.getHighlightRanges("abcd", "ab cd")).toEqual([
      { start: 0, end: 4 },
    ]);

    expect(searchHighlight.getHighlightRanges("abcdef", "abc bcd")).toEqual([
      { start: 0, end: 4 },
    ]);
  });

  it("handles terms that normalize to empty strings", () => {
    expect(searchHighlight.getHighlightRanges("abc", "\u0301")).toEqual([]);
  });

  it("handles text that normalizes to empty string", () => {
    expect(searchHighlight.getHighlightRanges("\u0301", "a")).toEqual([]);
  });

  it("returns ranges for multiple terms", () => {
    expect(
      searchHighlight.getHighlightRanges("alpha beta gamma", "alpha gamma")
    ).toEqual([
      { start: 0, end: 5 },
      { start: 11, end: 16 },
    ]);
  });

  it("renders highlighted text parts", () => {
    const result = searchHighlight.renderHighlightedText("Hello", "ell");
    expect(Array.isArray(result)).toBe(true);
    const parts = result as unknown as unknown[];
    expect(parts[0]).toBe("H");
    expect(parts[2]).toBe("o");
  });

  it("returns original text when query is empty", () => {
    expect(searchHighlight.renderHighlightedText("Hello", "")).toBe("Hello");
  });

  it("returns original value for null or undefined text", () => {
    expect(searchHighlight.renderHighlightedText(null, "a")).toBeNull();
    expect(searchHighlight.renderHighlightedText(undefined, "a")).toBe(
      undefined
    );
  });

  it("returns original text when query does not match", () => {
    expect(searchHighlight.renderHighlightedText("Hello", "xyz")).toBe("Hello");
  });
});

describe("search highlight custom highlight API integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    if (originalCSS === undefined) {
      delete (globalThis as any).CSS;
    } else {
      (globalThis as any).CSS = originalCSS;
    }

    if (originalHighlight === undefined) {
      delete (globalThis as any).Highlight;
    } else {
      (globalThis as any).Highlight = originalHighlight;
    }
  });

  it("is safe to call instance methods without a root", () => {
    const searchHighlight = new SearchHighlight();
    expect(() => searchHighlight.applyFromMarks("key")).not.toThrow();
    expect(() => searchHighlight.applyFromRanges([], "key")).not.toThrow();
    expect(() => searchHighlight.clear()).not.toThrow();
  });

  it("injects style for highlight pseudo-element when supported", () => {
    installMockCustomHighlights();
    const { root } = createShadowRoot();

    const searchHighlight = new SearchHighlight(root);
    expect(searchHighlight).toBeDefined();

    const style = root.querySelector("style");
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain("::highlight(ha-search-");
    expect(style!.textContent).toContain(".custom-highlight-active");
  });

  it("does not inject style when custom highlights are unavailable", () => {
    (globalThis as any).CSS = {};
    const { root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);
    expect(searchHighlight).toBeDefined();
    expect(root.querySelector("style")).toBeNull();
  });

  it("applies and clears highlights based on mark nodes", () => {
    const highlights = installMockCustomHighlights();
    const { host, root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    const mark = document.createElement("mark");
    mark.className = "ha-highlight";
    mark.append(document.createTextNode("Alpha"));

    const nonTextMark = document.createElement("mark");
    nonTextMark.className = "ha-highlight";
    const nested = document.createElement("span");
    nested.textContent = "ignored";
    nonTextMark.append(nested);

    root.append(mark, nonTextMark);

    searchHighlight.applyFromMarks("k1");
    expect(highlights.set).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(true);

    searchHighlight.applyFromMarks("k1");
    expect(highlights.set).toHaveBeenCalledTimes(1);

    searchHighlight.applyFromMarks("k2");
    expect(highlights.set).toHaveBeenCalledTimes(2);

    mark.remove();
    nonTextMark.remove();
    searchHighlight.applyFromMarks("k3");
    expect(highlights.delete).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(false);
  });

  it("applies range highlights and skips only exact duplicate range positions", () => {
    const highlights = installMockCustomHighlights();
    const { host, root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    const textNode = document.createTextNode("abcdef");
    root.append(textNode);

    const range = new Range();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 3);

    const movedRange = new Range();
    movedRange.setStart(textNode, 2);
    movedRange.setEnd(textNode, 4);

    searchHighlight.applyFromRanges([range], "same");
    searchHighlight.applyFromRanges([range], "same");
    expect(highlights.set).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(true);

    searchHighlight.applyFromRanges([movedRange], "same");
    expect(highlights.set).toHaveBeenCalledTimes(2);

    searchHighlight.applyFromRanges([], "clear");
    expect(highlights.delete).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(false);
  });

  it("observes mark mutations and re-applies highlights", async () => {
    const highlights = installMockCustomHighlights();
    const { root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    const mark = document.createElement("mark");
    mark.className = "ha-highlight";
    mark.append(document.createTextNode("Alpha"));
    root.append(mark);

    searchHighlight.startAutoSyncFromMarks(() => "key");
    await flushMutationObserver();
    expect(highlights.set).toHaveBeenCalledTimes(1);

    (mark.firstChild as Text).textContent = "Alphabet";
    await flushMutationObserver();
    expect(highlights.set).toHaveBeenCalledTimes(2);
  });

  it("stops observing mark mutations when stopped", async () => {
    const highlights = installMockCustomHighlights();
    const { root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    const mark = document.createElement("mark");
    mark.className = "ha-highlight";
    mark.append(document.createTextNode("Alpha"));
    root.append(mark);

    searchHighlight.startAutoSyncFromMarks(() => "key");
    await flushMutationObserver();
    expect(highlights.set).toHaveBeenCalledTimes(1);

    searchHighlight.stopAutoSyncFromMarks();
    (mark.firstChild as Text).textContent = "Alphabet";
    await flushMutationObserver();
    expect(highlights.set).toHaveBeenCalledTimes(1);
  });

  it("clears highlights when observed key becomes empty", async () => {
    const highlights = installMockCustomHighlights();
    const { host, root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    const mark = document.createElement("mark");
    mark.className = "ha-highlight";
    mark.append(document.createTextNode("Alpha"));
    root.append(mark);

    let key = "key";
    searchHighlight.startAutoSyncFromMarks(() => key);
    await flushMutationObserver();
    expect(highlights.set).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(true);

    key = " ";
    (mark.firstChild as Text).textContent = "Alphabet";
    await flushMutationObserver();
    expect(highlights.delete).toHaveBeenCalledTimes(1);
    expect(host.classList.contains("custom-highlight-active")).toBe(false);
  });

  it("cannot apply highlights if support is added after construction", () => {
    (globalThis as any).CSS = {};
    const { root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);
    const highlights = installMockCustomHighlights();

    const textNode = document.createTextNode("abc");
    root.append(textNode);
    const range = new Range();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);

    searchHighlight.applyFromRanges([range], "late-support");
    expect(highlights.set).not.toHaveBeenCalled();
  });

  it("clear still removes host class even without CSS.highlights", () => {
    installMockCustomHighlights();
    const { host, root } = createShadowRoot();
    const searchHighlight = new SearchHighlight(root);

    host.classList.add("custom-highlight-active");

    (globalThis as any).CSS = {};
    searchHighlight.clear();

    expect(host.classList.contains("custom-highlight-active")).toBe(false);
  });
});
