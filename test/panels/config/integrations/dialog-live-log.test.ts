import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeIntegrationLog } from "../../../../src/data/error_log";
import "../../../../src/panels/config/integrations/dialog-live-log";

vi.mock("../../../../src/components/ha-alert", () => ({}));
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
  Object.assign(dialog, { hass: { localize: (key: string) => key } });
  document.body.append(dialog);
  dialog.showDialog({ domain: "test", name: "Test" });
  await dialog.updateComplete;

  const logRenderer = dialog.shadowRoot!.querySelector("ha-ansi-to-html")!;
  await logRenderer.updateComplete;

  const renderedLog = logRenderer.shadowRoot!.querySelector("pre")!;
  const scrollContainer =
    dialog.shadowRoot!.querySelector<HTMLElement>(".log")!;

  vi.spyOn(scrollContainer, "scrollHeight", "get").mockImplementation(() => {
    const renderedLineCount = renderedLog.childElementCount;
    return renderedLineCount * LOG_LINE_HEIGHT;
  });
  vi.spyOn(scrollContainer, "clientHeight", "get").mockReturnValue(
    LOG_VIEWPORT_HEIGHT
  );

  const subscriptionCall = vi.mocked(subscribeIntegrationLog).mock.calls[0];
  const receiveLogLines = subscriptionCall[2];

  return { receiveLogLines, renderedLog, scrollContainer };
};

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
