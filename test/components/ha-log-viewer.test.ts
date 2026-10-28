import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../src/components/ha-log-viewer";

vi.mock("../../src/components/ha-button", () => ({}));
vi.mock("../../src/components/ha-svg-icon", () => ({}));

const MAX_RETAINED_LINES = 5000;
const LOG_LINE_HEIGHT = 20;
const LOG_VIEWPORT_HEIGHT = 200;
const ANIMATION_FRAME_DURATION = 16;
const FILTER_DEBOUNCE = 150;

let viewer: HTMLElementTagNameMap["ha-log-viewer"];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  if (viewer) {
    viewer.remove();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const openLogViewer = async () => {
  viewer = document.createElement("ha-log-viewer");
  Object.assign(viewer, {
    _i18n: { localize: (key: string) => key },
  });
  document.body.append(viewer);
  await viewer.updateComplete;

  const scrollContainer =
    viewer.shadowRoot!.querySelector<HTMLElement>(".log")!;
  scrollContainer.scrollTo = vi.fn();

  const logRenderer = viewer.shadowRoot!.querySelector("ha-ansi-to-html")!;
  await logRenderer.updateComplete;
  vi.mocked(scrollContainer.scrollTo).mockClear();

  const renderedLog = logRenderer.shadowRoot!.querySelector("pre")!;

  vi.spyOn(scrollContainer, "scrollHeight", "get").mockImplementation(() => {
    const renderedRows = Array.from(renderedLog.querySelectorAll("div"));
    const visibleRows = renderedRows.filter(
      (row) => row.style.display !== "none"
    );
    return visibleRows.length * LOG_LINE_HEIGHT;
  });
  vi.spyOn(scrollContainer, "clientHeight", "get").mockReturnValue(
    LOG_VIEWPORT_HEIGHT
  );

  return { renderedLog, scrollContainer };
};

const getVisibleLines = (renderedLog: HTMLPreElement) =>
  Array.from(renderedLog.querySelectorAll("div"))
    .filter((row) => row.style.display !== "none")
    .map((row) => row.textContent);

const createLogLines = (firstLineNumber: number, numberOfLines: number) => {
  const lines: string[] = [];

  for (let index = 0; index < numberOfLines; index++) {
    const lineNumber = firstLineNumber + index;
    lines.push(`line ${lineNumber}`);
  }

  return lines;
};

const openViewerWithFullLog = async () => {
  const logViewer = await openLogViewer();
  const initialLines = createLogLines(0, MAX_RETAINED_LINES);

  viewer.addLines(initialLines);
  await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

  return logViewer;
};

const expectRetainedLines = (
  renderedLog: HTMLPreElement,
  expectedLines: string[]
) => {
  const renderedRows = renderedLog.querySelectorAll("div");
  const renderedLines = Array.from(renderedRows, (row) => row.textContent);

  expect(viewer.lines).toEqual(expectedLines);
  expect(renderedLines).toEqual(expectedLines);
};

const search = async (value: string) => {
  viewer.filter = value;
  await viewer.updateComplete;
  await vi.advanceTimersByTimeAsync(FILTER_DEBOUNCE);
};

describe("ha-log-viewer retention", { timeout: 15000 }, () => {
  it("renders lines added before the first render", async () => {
    viewer = document.createElement("ha-log-viewer");
    Object.assign(viewer, {
      _i18n: { localize: (key: string) => key },
    });
    viewer.addLines(["early 1", "early 2"]);
    document.body.append(viewer);
    await viewer.updateComplete;
    viewer.shadowRoot!.querySelector<HTMLElement>(".log")!.scrollTo = vi.fn();
    const logRenderer = viewer.shadowRoot!.querySelector("ha-ansi-to-html")!;
    await logRenderer.updateComplete;

    const renderedLog = logRenderer.shadowRoot!.querySelector("pre")!;
    expectRetainedLines(renderedLog, ["early 1", "early 2"]);
  });

  it("evicts the oldest stored and DOM lines as new batches arrive", async () => {
    const { renderedLog } = await openViewerWithFullLog();
    const initialLines = createLogLines(0, MAX_RETAINED_LINES);
    expectRetainedLines(renderedLog, initialLines);

    const linesPerBatch = 100;
    const numberOfBatches = 3;
    let totalReceivedLines = MAX_RETAINED_LINES;

    for (let batchIndex = 0; batchIndex < numberOfBatches; batchIndex++) {
      const incomingLines = createLogLines(totalReceivedLines, linesPerBatch);
      viewer.addLines(incomingLines);
      totalReceivedLines += linesPerBatch;

      const firstRetainedLineNumber = totalReceivedLines - MAX_RETAINED_LINES;
      const expectedLines = createLogLines(
        firstRetainedLineNumber,
        MAX_RETAINED_LINES
      );
      expectRetainedLines(renderedLog, expectedLines);
    }
  });

  it("retains only the newest lines up to the limit from an oversized multiline batch", async () => {
    const { renderedLog } = await openLogViewer();
    const excessLineCount = 1000;
    const incomingLines = createLogLines(
      0,
      MAX_RETAINED_LINES + excessLineCount
    );
    const multilineMessages: string[] = [];

    for (let lineIndex = 0; lineIndex < incomingLines.length; lineIndex += 2) {
      const firstLine = incomingLines[lineIndex];
      const secondLine = incomingLines[lineIndex + 1];
      multilineMessages.push(`${firstLine}\n${secondLine}`);
    }

    viewer.addLines(multilineMessages);

    const expectedLines = createLogLines(excessLineCount, MAX_RETAINED_LINES);
    expectRetainedLines(renderedLog, expectedLines);

    viewer.addLines([]);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("preserves the reading position when lines above it are removed", async () => {
    const { renderedLog, scrollContainer } = await openViewerWithFullLog();
    const initialScrollTop = 2007;
    scrollContainer.scrollTop = initialScrollTop;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 2);
    viewer.addLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const removedHeight = removedLineCount * LOG_LINE_HEIGHT;
    const expectedScrollTop = initialScrollTop - removedHeight;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);

    expect(scrollContainer.scrollTop).toBe(expectedScrollTop);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("scrolls to the top when the line being read is removed", async () => {
    const { renderedLog, scrollContainer } = await openViewerWithFullLog();
    scrollContainer.scrollTop = 7;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 2);
    viewer.addLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);
    expect(scrollContainer.scrollTop).toBe(0);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("continues following the bottom after evicting old lines", async () => {
    const { renderedLog, scrollContainer } = await openViewerWithFullLog();
    const bottomScrollPosition =
      scrollContainer.scrollHeight - scrollContainer.clientHeight;
    scrollContainer.scrollTop = bottomScrollPosition;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 1);
    viewer.addLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("clears the stored and rendered lines", async () => {
    const { renderedLog } = await openLogViewer();
    viewer.addLines(["one", "two"]);

    viewer.clear();

    expectRetainedLines(renderedLog, []);
  });
});

describe("ha-log-viewer high volume", { timeout: 15000 }, () => {
  it("bounds high-volume batches without exceeding the function argument limit", async () => {
    const { renderedLog } = await openLogViewer();
    const batchSize = 150000;
    for (let batchIndex = 0; batchIndex < 2; batchIndex++) {
      viewer.addLines(createLogLines(batchIndex * batchSize, batchSize));
      const firstRetainedLine =
        (batchIndex + 1) * batchSize - MAX_RETAINED_LINES;
      expectRetainedLines(
        renderedLog,
        createLogLines(firstRetainedLine, MAX_RETAINED_LINES)
      );
    }
  });

  it("keeps following after a scroll event caused by trimming a batch", async () => {
    const { scrollContainer } = await openViewerWithFullLog();
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - LOG_VIEWPORT_HEIGHT;

    viewer.addLines(createLogLines(MAX_RETAINED_LINES, 10));
    scrollContainer.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
  });

  it("shows the new logs indicator when scrolled up", async () => {
    const { scrollContainer } = await openLogViewer();
    viewer.addLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));

    viewer.addLines(["new line"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(107);
    expect(viewer["_newLogsIndicator"]).toBe(true);
  });

  it("disables the new logs indicator while it is hidden", async () => {
    const { scrollContainer } = await openLogViewer();
    const indicator = viewer.shadowRoot!.querySelector<
      HTMLElement & { disabled: boolean }
    >(".new-logs-indicator")!;
    expect(indicator.disabled).toBe(true);

    viewer.addLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));
    viewer.addLines(["new line"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    await viewer.updateComplete;

    expect(indicator.disabled).toBe(false);
  });
});

describe("ha-log-viewer search", () => {
  it("hides lines that don't match and reports when nothing matches", async () => {
    const { renderedLog } = await openLogViewer();
    viewer.addLines(["first match", "other", "second match"]);

    await search("match");
    expect(getVisibleLines(renderedLog)).toEqual([
      "first match",
      "second match",
    ]);
    expect(viewer["_noMatches"]).toBe(false);

    await search("missing");
    expect(viewer["_noMatches"]).toBe(true);
  });

  it("filters lines added while a search is active", async () => {
    const { renderedLog } = await openLogViewer();
    viewer.addLines(["first match"]);
    await search("match");

    viewer.addLines(["other", "second match"]);

    expect(getVisibleLines(renderedLog)).toEqual([
      "first match",
      "second match",
    ]);
  });

  it("reports no matches when the only matching line is evicted", async () => {
    const { renderedLog } = await openLogViewer();
    viewer.addLines(["match", ...createLogLines(1, MAX_RETAINED_LINES - 1)]);
    await search("match");
    expect(viewer["_noMatches"]).toBe(false);

    viewer.addLines(createLogLines(MAX_RETAINED_LINES, 1));

    expect(getVisibleLines(renderedLog)).toEqual([]);
    expect(viewer["_noMatches"]).toBe(true);
  });

  it("keeps the reading position while searching and scrolls down when cleared", async () => {
    const { scrollContainer } = await openViewerWithFullLog();

    await search("line 1");
    expect(scrollContainer.scrollTo).not.toHaveBeenCalled();

    await search("");
    expect(scrollContainer.scrollTo).toHaveBeenCalledTimes(1);
  });
});
