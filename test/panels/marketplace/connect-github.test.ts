import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteConfigFlow } from "../../../src/data/config_flow";
import { showConfigFlowDialog } from "../../../src/dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import type { MarketplaceInfo } from "../../../src/data/marketplace/marketplace";
import {
  ERROR_GITHUB_NOT_CONNECTED,
  ERROR_GITHUB_RATE_LIMITED,
} from "../../../src/data/marketplace/websocket";
import {
  ensureGitHubConnected,
  handleGitHubNotConnected,
  handleGitHubRateLimited,
  showConnectGitHubFlow,
} from "../../../src/panels/marketplace/tools/connect-github";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { HomeAssistant } from "../../../src/types";

vi.mock("../../../src/data/config_flow", () => ({
  deleteConfigFlow: vi.fn(async () => undefined),
}));

vi.mock("../../../src/dialogs/config-flow/show-dialog-config-flow", () => ({
  showConfigFlowDialog: vi.fn(),
}));

vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(async () => undefined),
  showConfirmationDialog: vi.fn(async () => true),
}));

const FLOW_ID = "abc123";

const mockHass = ({
  githubConnected = true,
  connectError,
}: { githubConnected?: boolean; connectError?: unknown } = {}) =>
  ({
    callApi: vi.fn(async () => undefined),
    callWS: vi.fn(async (message: { type: string }) => {
      if (message.type === "marketplace/github/connect") {
        if (connectError) {
          throw connectError;
        }
        return { flow_id: FLOW_ID };
      }
      return { github_connected: githubConnected };
    }),
  }) as unknown as HomeAssistant;

const localize = ((key: string) => key) as LocalizeFunc;

// The flow dialog reports how it closed through its callback.
const closeFlowDialog = (flowFinished: boolean) => {
  vi.mocked(showConfigFlowDialog).mockImplementation((_element, params) => {
    params.dialogClosedCallback!({ flowFinished });
  });
};

const element = document.createElement("div");

describe("showConnectGitHubFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues the flow the backend started", async () => {
    closeFlowDialog(true);
    const hass = mockHass();

    expect(await showConnectGitHubFlow(element, hass, localize)).toBe(true);
    expect(showConfigFlowDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ continueFlowId: FLOW_ID })
    );
    expect(deleteConfigFlow).not.toHaveBeenCalled();
  });

  it("removes the flow when the dialog is closed early", async () => {
    closeFlowDialog(false);
    const hass = mockHass();

    expect(await showConnectGitHubFlow(element, hass, localize)).toBe(false);
    expect(deleteConfigFlow).toHaveBeenCalledWith(hass, FLOW_ID);
  });

  it("asks the backend, because a finished flow can be an abort", async () => {
    closeFlowDialog(true);

    expect(
      await showConnectGitHubFlow(
        element,
        mockHass({ githubConnected: false }),
        localize
      )
    ).toBe(false);
  });

  it("shows why the flow could not start", async () => {
    const hass = mockHass({ connectError: { message: "No entry" } });

    expect(await showConnectGitHubFlow(element, hass, localize)).toBe(false);
    expect(showAlertDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({ text: "No entry" })
    );
    expect(showConfigFlowDialog).not.toHaveBeenCalled();
  });
});

describe("ensureGitHubConnected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeFlowDialog(true);
  });

  it("lets adding go ahead while connected", () => {
    const info = { github_connected: true } as MarketplaceInfo;

    expect(ensureGitHubConnected(element, mockHass(), localize, info)).toBe(
      true
    );
    expect(showConfigFlowDialog).not.toHaveBeenCalled();
  });

  it("starts the connect flow while not connected", async () => {
    const hass = mockHass();
    const info = { github_connected: false } as MarketplaceInfo;

    expect(ensureGitHubConnected(element, hass, localize, info)).toBe(false);
    await vi.waitFor(() => expect(showConfigFlowDialog).toHaveBeenCalled());
  });
});

describe("handleGitHubNotConnected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeFlowDialog(true);
  });

  it("starts the connect flow", async () => {
    expect(
      handleGitHubNotConnected(element, mockHass(), localize, {
        code: ERROR_GITHUB_NOT_CONNECTED,
      })
    ).toBe(true);
    await vi.waitFor(() => expect(showConfigFlowDialog).toHaveBeenCalled());
  });

  it("leaves other errors to the caller", () => {
    expect(
      handleGitHubNotConnected(element, mockHass(), localize, {
        code: "unknown_error",
      })
    ).toBe(false);
    expect(showConfigFlowDialog).not.toHaveBeenCalled();
  });
});

describe("handleGitHubRateLimited", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeFlowDialog(true);
  });

  it("offers to connect GitHub", async () => {
    expect(
      handleGitHubRateLimited(element, mockHass(), localize, {
        code: ERROR_GITHUB_RATE_LIMITED,
      })
    ).toBe(true);

    const params = vi.mocked(showConfirmationDialog).mock.calls[0][1];
    expect(showConfigFlowDialog).not.toHaveBeenCalled();

    params.confirm!();
    await vi.waitFor(() => expect(showConfigFlowDialog).toHaveBeenCalled());
  });

  it("leaves other errors to the caller", () => {
    expect(
      handleGitHubRateLimited(element, mockHass(), localize, {
        code: "unknown_error",
      })
    ).toBe(false);
    expect(showConfirmationDialog).not.toHaveBeenCalled();
  });
});
