import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeIntegrationLog } from "../../../../src/data/error_log";
import "../../../../src/panels/config/integrations/dialog-live-log";

vi.mock("../../../../src/components/ha-alert", () => ({}));
vi.mock("../../../../src/components/chips/ha-chip-set", () => ({}));
vi.mock("../../../../src/components/chips/ha-filter-chip", () => ({}));
vi.mock("../../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../../src/components/ha-svg-icon", () => ({}));
vi.mock("../../../../src/components/input/ha-input-search", () => ({}));
vi.mock("../../../../src/components/input/ha-input", () => ({}));
vi.mock("../../../../src/components/ha-button", () => ({}));
vi.mock("../../../../src/components/ha-dialog", () => ({}));
vi.mock("../../../../src/components/ha-dialog-footer", () => ({}));
vi.mock("../../../../src/data/error_log", () => ({
  subscribeIntegrationLog: vi.fn(async () => vi.fn()),
}));

const MAX_RETAINED_LINES = 5000;
const LOG_LINE_HEIGHT = 20;
const LOG_VIEWPORT_HEIGHT = 200;
const ANIMATION_FRAME_DURATION = 16;

let dialog: HTMLElementTagNameMap["dialog-live-log"];

const connectionListeners: Record<string, () => void> = {};

const connection = {
  addEventListener: vi.fn((event: string, listener: () => void) => {
    connectionListeners[event] = listener;
  }),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  if (dialog) {
    dialog.remove();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const openLogDialog = async () => {
  dialog = document.createElement("dialog-live-log");
  Object.assign(dialog, {
    params: { domain: "test", name: "Test" },
    _i18n: { localize: (key: string) => key },
    _connection: { connection },
  });
  document.body.append(dialog);
  await dialog.updateComplete;

  const logRenderer = dialog.shadowRoot!.querySelector("ha-ansi-to-html")!;
  await logRenderer.updateComplete;

  const renderedLog = logRenderer.shadowRoot!.querySelector("pre")!;
  const scrollContainer =
    dialog.shadowRoot!.querySelector<HTMLElement>(".log")!;

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
  scrollContainer.scrollTo = vi.fn();

  const subscriptionCall = vi.mocked(subscribeIntegrationLog).mock.calls[0];
  const receiveLogLines = subscriptionCall[2];

  return { receiveLogLines, renderedLog, scrollContainer };
};

const changeLineLimit = (value: string) => {
  const input = dialog.shadowRoot!.querySelector("ha-input")!;
  input.value = value;
  input.dispatchEvent(new Event("change"));
  return input;
};

const getRenderedLines = (renderedLog: HTMLPreElement) =>
  Array.from(renderedLog.querySelectorAll("div"), (row) => row.textContent);

const createLogLines = (firstLineNumber: number, numberOfLines: number) => {
  const lines: string[] = [];

  for (let index = 0; index < numberOfLines; index++) {
    const lineNumber = firstLineNumber + index;
    lines.push(`line ${lineNumber}`);
  }

  return lines;
};

const openDialogWithFullLog = async () => {
  const logDialog = await openLogDialog();
  const initialLines = createLogLines(0, MAX_RETAINED_LINES);

  logDialog.receiveLogLines(initialLines);
  await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

  return logDialog;
};

const expectRetainedLines = (
  renderedLog: HTMLPreElement,
  expectedLines: string[]
) => {
  const storedLines = dialog["_lines"].map((line) => line.text);
  const renderedRows = renderedLog.querySelectorAll("div");
  const renderedLines = Array.from(renderedRows, (row) => row.textContent);

  expect(storedLines).toEqual(expectedLines);
  expect(renderedLines).toEqual(expectedLines);
};

describe("dialog-live-log retention", { timeout: 15000 }, () => {
  it("evicts the oldest stored and DOM lines as new batches arrive", async () => {
    const { receiveLogLines, renderedLog } = await openDialogWithFullLog();
    const initialLines = createLogLines(0, MAX_RETAINED_LINES);
    expectRetainedLines(renderedLog, initialLines);

    const linesPerBatch = 100;
    const numberOfBatches = 3;
    let totalReceivedLines = MAX_RETAINED_LINES;

    for (let batchIndex = 0; batchIndex < numberOfBatches; batchIndex++) {
      const incomingLines = createLogLines(totalReceivedLines, linesPerBatch);
      receiveLogLines(incomingLines);
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
    const { receiveLogLines, renderedLog } = await openLogDialog();
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

    receiveLogLines(multilineMessages);

    const expectedLines = createLogLines(excessLineCount, MAX_RETAINED_LINES);
    expectRetainedLines(renderedLog, expectedLines);

    receiveLogLines([]);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("preserves the reading position when lines above it are removed", async () => {
    const { receiveLogLines, renderedLog, scrollContainer } =
      await openDialogWithFullLog();
    const initialScrollTop = 2007;
    scrollContainer.scrollTop = initialScrollTop;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 2);
    receiveLogLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const removedHeight = removedLineCount * LOG_LINE_HEIGHT;
    const expectedScrollTop = initialScrollTop - removedHeight;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);

    expect(scrollContainer.scrollTop).toBe(expectedScrollTop);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("scrolls to the top when the line being read is removed", async () => {
    const { receiveLogLines, renderedLog, scrollContainer } =
      await openDialogWithFullLog();
    scrollContainer.scrollTop = 7;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 2);
    receiveLogLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);
    expect(scrollContainer.scrollTop).toBe(0);
    expectRetainedLines(renderedLog, expectedLines);
  });

  it("continues following the bottom after evicting old lines", async () => {
    const { receiveLogLines, renderedLog, scrollContainer } =
      await openDialogWithFullLog();
    const bottomScrollPosition =
      scrollContainer.scrollHeight - scrollContainer.clientHeight;
    scrollContainer.scrollTop = bottomScrollPosition;

    const incomingLines = createLogLines(MAX_RETAINED_LINES, 1);
    receiveLogLines(incomingLines);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    const removedLineCount = incomingLines.length;
    const expectedLines = createLogLines(removedLineCount, MAX_RETAINED_LINES);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
    expectRetainedLines(renderedLog, expectedLines);
  });
});

describe("configurable live log retention", () => {
  it("changes the limit between streaming batches without resubscribing", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    changeLineLimit("10");
    receiveLogLines(createLogLines(0, 10));

    changeLineLimit("5");
    expectRetainedLines(renderedLog, createLogLines(5, 5));
    expect(dialog["_lineCount"]).toBe(5);
    expect(dialog["_shownCount"]).toBe(5);

    receiveLogLines(createLogLines(10, 2));
    expectRetainedLines(renderedLog, createLogLines(7, 5));

    changeLineLimit("8");
    expectRetainedLines(renderedLog, createLogLines(7, 5));
    receiveLogLines(createLogLines(12, 3));
    expectRetainedLines(renderedLog, createLogLines(7, 8));
    expect(dialog["_lineCount"]).toBe(8);
    expect(dialog["_shownCount"]).toBe(8);
    expect(subscribeIntegrationLog).toHaveBeenCalledTimes(1);
  });

  it("keeps paused lines separate from displayed lines when the limit changes", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    changeLineLimit("10");
    receiveLogLines(createLogLines(0, 6));
    dialog["_togglePause"]();
    receiveLogLines(createLogLines(6, 3));

    changeLineLimit("5");
    expect(dialog["_lines"].map((line) => line.text)).toEqual(
      createLogLines(4, 5)
    );
    expect(getRenderedLines(renderedLog)).toEqual(createLogLines(4, 2));
    expect(dialog["_lineCount"]).toBe(5);
    expect(dialog["_shownCount"]).toBe(2);

    changeLineLimit("8");
    receiveLogLines(createLogLines(9, 3));
    expect(getRenderedLines(renderedLog)).toEqual(createLogLines(4, 2));
    expect(dialog["_lineCount"]).toBe(8);

    dialog["_togglePause"]();
    expectRetainedLines(renderedLog, createLogLines(4, 8));
    expect(dialog["_shownCount"]).toBe(8);
    expect(subscribeIntegrationLog).toHaveBeenCalledTimes(1);
  });

  it("discards both displayed and buffered old lines during a long pause", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    changeLineLimit("5");
    receiveLogLines(createLogLines(0, 5));
    dialog["_togglePause"]();
    receiveLogLines(createLogLines(5, 20));

    expect(renderedLog.childElementCount).toBe(0);
    expect(dialog["_shownCount"]).toBe(0);
    expect(dialog["_lineCount"]).toBe(5);
    changeLineLimit("3");

    dialog["_togglePause"]();
    expectRetainedLines(renderedLog, createLogLines(22, 3));
  });

  it("bounds high-volume batches without exceeding the function argument limit", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    const lineLimit = 50;
    const batchSize = 150000;
    changeLineLimit(String(lineLimit));
    for (let batchIndex = 0; batchIndex < 2; batchIndex++) {
      receiveLogLines(createLogLines(batchIndex * batchSize, batchSize));
      const firstRetainedLine = (batchIndex + 1) * batchSize - lineLimit;
      expectRetainedLines(
        renderedLog,
        createLogLines(firstRetainedLine, lineLimit)
      );
    }
  });

  it("preserves the reading position when decreasing the limit", async () => {
    const { receiveLogLines, renderedLog, scrollContainer } =
      await openLogDialog();
    changeLineLimit("50");
    receiveLogLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 207;

    changeLineLimit("45");
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(207 - 5 * LOG_LINE_HEIGHT);
    expectRetainedLines(renderedLog, createLogLines(5, 45));

    changeLineLimit("100");
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(207 - 5 * LOG_LINE_HEIGHT);
  });

  it("keeps following the bottom when decreasing the limit", async () => {
    const { receiveLogLines, scrollContainer } = await openLogDialog();
    changeLineLimit("50");
    receiveLogLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    changeLineLimit("30");
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
  });

  it("cancels pending automatic scrolling when paused or scrolled up", async () => {
    const { receiveLogLines, scrollContainer } = await openLogDialog();
    receiveLogLines(createLogLines(0, 50));
    dialog["_togglePause"]();
    changeLineLimit("40");
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(0);

    dialog["_togglePause"]();
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    receiveLogLines(["new line"]);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));
    changeLineLimit("60");
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(107);
  });

  it("keeps following after a scroll event caused by trimming a batch", async () => {
    const { receiveLogLines, scrollContainer } = await openLogDialog();
    const lineLimit = 50;
    changeLineLimit(String(lineLimit));
    receiveLogLines(createLogLines(0, lineLimit));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - LOG_VIEWPORT_HEIGHT;

    receiveLogLines(createLogLines(lineLimit, 10));
    scrollContainer.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
  });

  it("preserves filtered reading positions and never restores discarded lines", async () => {
    const { receiveLogLines, renderedLog, scrollContainer } =
      await openLogDialog();
    const lines = Array.from({ length: 80 }, (_, index) => {
      const level = index % 2 === 0 ? "DEBUG" : "ERROR";
      const message = index % 4 === 1 ? "keep" : "hide";
      return `2026-10-10 12:00:00 ${level} ${message} ${index}`;
    });
    changeLineLimit("80");
    receiveLogLines(lines);
    dialog["_levels"] = new Set(["error"]);
    dialog["_search"] = "keep";
    dialog["_rerender"]();
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));

    changeLineLimit("76");
    expect(scrollContainer.scrollTop).toBe(107 - LOG_LINE_HEIGHT);
    expect(getRenderedLines(renderedLog)).toEqual(
      lines.slice(4).filter((line) => line.includes("ERROR"))
    );
    const visibleRows = Array.from(renderedLog.querySelectorAll("div")).filter(
      (row) => row.style.display !== "none"
    );
    expect(visibleRows.map((row) => row.textContent)).toEqual(
      lines.slice(4).filter((line) => line.includes("ERROR keep"))
    );

    dialog["_levels"] = new Set(["debug", "info", "warning", "error"]);
    dialog["_search"] = "";
    dialog["_rerender"]();
    expectRetainedLines(renderedLog, lines.slice(4));
  });

  it("retains the level of continuation lines when their record header is discarded", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    changeLineLimit("2");
    receiveLogLines(["2026-10-10 12:00:00 ERROR failure\ntrace 1\ntrace 2"]);
    expect(dialog["_lines"].map((line) => line.level)).toEqual([
      "error",
      "error",
    ]);
    dialog["_levels"] = new Set(["debug"]);
    dialog["_rerender"]();
    expect(renderedLog.childElementCount).toBe(0);
    expect(dialog["_noMatches"]).toBe(true);
    dialog["_levels"] = new Set(["error"]);
    dialog["_rerender"]();
    expectRetainedLines(renderedLog, ["trace 1", "trace 2"]);
    expect(dialog["_noMatches"]).toBe(false);
  });

  it("does not trim while the user is still typing a limit", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    receiveLogLines(createLogLines(0, 20));
    const input = dialog.shadowRoot!.querySelector("ha-input")!;
    input.value = "5";
    input.dispatchEvent(new Event("input"));
    receiveLogLines(["line 20"]);
    expectRetainedLines(renderedLog, createLogLines(0, 21));
    input.value = "500";
    input.dispatchEvent(new Event("change"));
    expect(dialog["_lineLimit"]).toBe(500);
    expectRetainedLines(renderedLog, createLogLines(0, 21));
  });

  it.each([
    "",
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "abc",
    "1e3",
    "9007199254740992",
  ])("rejects invalid limit %j without discarding lines", async (value) => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    receiveLogLines(createLogLines(0, 10));
    const input = changeLineLimit(value);
    expect(input.invalid).toBe(true);
    expect(dialog["_lineLimit"]).toBe(MAX_RETAINED_LINES);
    expectRetainedLines(renderedLog, createLogLines(0, 10));
    changeLineLimit("20");
    expect(input.invalid).toBe(false);
    expect(dialog["_lineLimit"]).toBe(20);
  });

  it.each([1, 500, 3000, 10000, 50000])(
    "accepts a custom limit of %i",
    async (limit) => {
      await openLogDialog();
      const input = changeLineLimit(String(limit));
      expect(input.invalid).toBe(false);
      expect(dialog["_lineLimit"]).toBe(limit);
      expect(subscribeIntegrationLog).toHaveBeenCalledTimes(1);
    }
  );
});

describe("dialog-live-log connection", () => {
  it("subscribes again without duplicating the backlog after a reconnect", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    receiveLogLines(["backlog 1", "backlog 2"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);

    connectionListeners.disconnected();
    await dialog.updateComplete;
    expect(dialog["_live"]).toBe(false);

    connectionListeners.ready();
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(subscribeIntegrationLog).toHaveBeenCalledTimes(2);
    expect(dialog["_live"]).toBe(true);

    const receiveAfterReconnect = vi.mocked(subscribeIntegrationLog).mock
      .calls[1][2];
    receiveAfterReconnect(["backlog 1", "backlog 2", "new"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(getRenderedLines(renderedLog)).toEqual([
      "backlog 1",
      "backlog 2",
      "new",
    ]);
  });

  it("unsubscribes and stops listening to the connection when removed", async () => {
    await openLogDialog();
    const unsub = await vi.mocked(subscribeIntegrationLog).mock.results[0]
      .value;

    dialog.remove();
    await vi.advanceTimersByTimeAsync(0);

    expect(unsub).toHaveBeenCalled();
    expect(connection.removeEventListener).toHaveBeenCalledWith(
      "ready",
      connectionListeners.ready
    );
  });
});
