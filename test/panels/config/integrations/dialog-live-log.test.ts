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
vi.mock("../../../../src/components/ha-log-viewer", () => {
  class HaLogViewerStub extends HTMLElement {
    public lines: string[] = [];

    public addLines(lines: string[]) {
      this.lines = this.lines.concat(lines);
    }

    public clear() {
      this.lines = [];
    }
  }
  customElements.define("ha-log-viewer", HaLogViewerStub);
  return {};
});
vi.mock("../../../../src/data/error_log", () => ({
  subscribeIntegrationLog: vi.fn(async () => vi.fn()),
}));

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

  const logViewer = dialog.shadowRoot!.querySelector("ha-log-viewer")!;
  const subscriptionCall = vi.mocked(subscribeIntegrationLog).mock.calls[0];
  const receiveLogLines = subscriptionCall[2];

  return { receiveLogLines, logViewer };
};

describe("dialog-live-log connection", () => {
  it("subscribes again without duplicating the backlog after a reconnect", async () => {
    const { receiveLogLines, logViewer } = await openLogDialog();
    receiveLogLines(["backlog 1", "backlog 2"]);
    expect(dialog["_lineCount"]).toBe(2);

    connectionListeners.disconnected();
    await dialog.updateComplete;
    expect(dialog["_live"]).toBe(false);

    connectionListeners.ready();
    await vi.advanceTimersByTimeAsync(0);
    expect(subscribeIntegrationLog).toHaveBeenCalledTimes(2);
    expect(dialog["_live"]).toBe(true);
    expect(dialog["_lineCount"]).toBe(0);

    const receiveAfterReconnect = vi.mocked(subscribeIntegrationLog).mock
      .calls[1][2];
    receiveAfterReconnect(["backlog 1", "backlog 2", "new"]);
    expect(logViewer.lines).toEqual(["backlog 1", "backlog 2", "new"]);
    expect(dialog["_lineCount"]).toBe(3);
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
