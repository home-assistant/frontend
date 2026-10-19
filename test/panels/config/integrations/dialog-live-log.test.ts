import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeIntegrationLog } from "../../../../src/data/error_log";
import "../../../../src/panels/config/integrations/dialog-live-log";

vi.mock("../../../../src/components/ha-alert", () => ({}));
vi.mock("../../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../../src/components/ha-svg-icon", () => ({}));
vi.mock("../../../../src/components/input/ha-input-search", () => ({}));
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

const mountDialog = async () => {
  dialog = document.createElement("dialog-live-log");
  Object.assign(dialog, {
    params: { domain: "test", name: "Test" },
    _i18n: { localize: (key: string) => key },
    _connection: { connection },
  });
  document.body.append(dialog);
  await dialog.updateComplete;
};

const openLogDialog = async () => {
  await mountDialog();

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
  const storedLines = dialog["_lines"];
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

describe("dialog-live-log high volume", { timeout: 15000 }, () => {
  it("bounds high-volume batches without exceeding the function argument limit", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    const batchSize = 150000;
    for (let batchIndex = 0; batchIndex < 2; batchIndex++) {
      receiveLogLines(createLogLines(batchIndex * batchSize, batchSize));
      const firstRetainedLine =
        (batchIndex + 1) * batchSize - MAX_RETAINED_LINES;
      expectRetainedLines(
        renderedLog,
        createLogLines(firstRetainedLine, MAX_RETAINED_LINES)
      );
    }
  });

  it("keeps following after a scroll event caused by trimming a batch", async () => {
    const { receiveLogLines, scrollContainer } = await openDialogWithFullLog();
    scrollContainer.scrollTop =
      scrollContainer.scrollHeight - LOG_VIEWPORT_HEIGHT;

    receiveLogLines(createLogLines(MAX_RETAINED_LINES, 10));
    scrollContainer.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(scrollContainer.scrollHeight);
  });

  it("shows the new logs indicator when scrolled up", async () => {
    const { receiveLogLines, scrollContainer } = await openLogDialog();
    receiveLogLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));

    receiveLogLines(["new line"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    expect(scrollContainer.scrollTop).toBe(107);
    expect(dialog["_newLogsIndicator"]).toBe(true);
  });

  it("disables the new logs indicator while it is hidden", async () => {
    const { receiveLogLines, scrollContainer } = await openLogDialog();
    const indicator = dialog.shadowRoot!.querySelector<
      HTMLElement & { disabled: boolean }
    >(".new-logs-indicator")!;
    expect(indicator.disabled).toBe(true);

    receiveLogLines(createLogLines(0, 50));
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    scrollContainer.scrollTop = 107;
    scrollContainer.dispatchEvent(new Event("scroll"));
    receiveLogLines(["new line"]);
    await vi.advanceTimersByTimeAsync(ANIMATION_FRAME_DURATION);
    await dialog.updateComplete;

    expect(indicator.disabled).toBe(false);
  });
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

  it("ignores a failed subscription when removed before it settles", async () => {
    let rejectSubscription!: (err: unknown) => void;
    vi.mocked(subscribeIntegrationLog).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectSubscription = reject;
      })
    );
    await mountDialog();

    dialog.remove();
    rejectSubscription({ code: "unknown_error" });
    await vi.advanceTimersByTimeAsync(0);

    expect(connection.removeEventListener).toHaveBeenCalled();
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

describe("dialog-live-log subscription errors", () => {
  it("shows unsupported when the backend doesn't know the command", async () => {
    vi.mocked(subscribeIntegrationLog).mockRejectedValueOnce({
      code: "unknown_command",
      message: "Unknown command.",
    });
    await mountDialog();
    await dialog.updateComplete;

    expect(dialog.shadowRoot!.querySelector("ha-alert")).not.toBeNull();
  });

  it("shows the error when the subscription fails otherwise", async () => {
    vi.mocked(subscribeIntegrationLog).mockRejectedValueOnce({
      code: "not_found",
      message: "Integration not found",
    });
    await mountDialog();
    await dialog.updateComplete;

    expect(
      dialog.shadowRoot!.querySelector("ha-alert")?.textContent?.trim()
    ).toBe("Integration not found");
    expect(dialog.shadowRoot!.querySelector(".toolbar")).toBeNull();
  });

  it("subscribes again on ready when the subscription failed on a lost connection", async () => {
    vi.mocked(subscribeIntegrationLog).mockRejectedValueOnce(3);
    await openLogDialog();
    await dialog.updateComplete;
    expect(dialog.shadowRoot!.querySelector("ha-alert")).toBeNull();

    connectionListeners.ready();
    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeIntegrationLog).toHaveBeenCalledTimes(2);
    expect(dialog["_live"]).toBe(true);
  });
});

describe("dialog-live-log search", () => {
  const search = async (value: string) => {
    const input = dialog.shadowRoot!.querySelector("ha-input-search")!;
    input.value = value;
    input.dispatchEvent(new Event("input"));
    await vi.advanceTimersByTimeAsync(150);
  };

  it("hides lines that don't match and reports when nothing matches", async () => {
    const { receiveLogLines, renderedLog } = await openLogDialog();
    receiveLogLines(["first match", "other", "second match"]);

    await search("match");
    const visibleRows = Array.from(renderedLog.querySelectorAll("div")).filter(
      (row) => row.style.display !== "none"
    );
    expect(visibleRows.map((row) => row.textContent)).toEqual([
      "first match",
      "second match",
    ]);
    expect(dialog["_noMatches"]).toBe(false);

    await search("missing");
    expect(dialog["_noMatches"]).toBe(true);
  });

  it("keeps the reading position while searching and scrolls down when cleared", async () => {
    const { scrollContainer } = await openDialogWithFullLog();

    await search("line 1");
    expect(scrollContainer.scrollTo).not.toHaveBeenCalled();

    await search("");
    expect(scrollContainer.scrollTo).toHaveBeenCalledTimes(1);
  });
});
