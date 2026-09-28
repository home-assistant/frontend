import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-custom-repositories";
import type { DialogMarketplaceCustomRepositories } from "../../../src/panels/marketplace/dialogs/dialog-marketplace-custom-repositories";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-form";
import { showConnectGitHubFlow } from "../../../src/panels/marketplace/tools/connect-github";
import type * as ConnectGitHubModule from "../../../src/panels/marketplace/tools/connect-github";
import type { Deferred, MockConnection, SendMessage } from "./dialog-host";
import {
  deferred,
  getInternals,
  mockConnection,
  openDialog,
  settle,
} from "./dialog-host";

// The real components need more browser than jsdom has, the dialogs only
// hand them properties.
const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/components/ha-alert", () => stubElement("ha-alert"));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-dialog", async () => {
  (await import("./dialog-host")).defineClosingDialogStub();
  return {};
});
vi.mock("../../../src/components/ha-dialog-footer", () =>
  stubElement("ha-dialog-footer")
);
vi.mock("../../../src/components/ha-form/ha-form", () =>
  stubElement("ha-form")
);
vi.mock("../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);
vi.mock("../../../src/components/ha-settings-row", () =>
  stubElement("ha-settings-row")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock("../../../src/components/progress/ha-progress-bar", () =>
  stubElement("ha-progress-bar")
);
vi.mock(
  "../../../src/panels/marketplace/tools/connect-github",
  async (importOriginal) => ({
    ...(await importOriginal<typeof ConnectGitHubModule>()),
    showConnectGitHubFlow: vi.fn(async () => true),
  })
);

const REPOSITORY = {
  id: "1",
  name: "Repository",
  full_name: "owner/repository",
  category: "integration",
  custom: true,
} as unknown as RepositoryBase;

const marketplaceData = (githubConnected = true) =>
  ({
    repositories: [REPOSITORY],
    info: { github_connected: githubConnected, categories: ["integration"] },
  }) as unknown as MarketplaceData;

const openFormDialog = (
  saveAction?: () => Promise<void>,
  connection?: MockConnection
): Promise<HTMLElementTagNameMap["dialog-marketplace-form"]> =>
  openDialog(
    "dialog-marketplace-form",
    { marketplace: marketplaceData(), title: "Title", saveAction },
    connection
  );

describe("dialog-marketplace-form", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("closes once the action succeeds", async () => {
    const dialog = await openFormDialog(async () => undefined);
    const closed = vi.fn();
    dialog.addEventListener("dialog-closed", closed);

    await getInternals(dialog)._saveClicked();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(dialog.isConnected).toBe(false);
  });

  it("stays open and shows why the action failed", async () => {
    const dialog = await openFormDialog(async () => {
      throw new Error("Nope");
    });

    await getInternals(dialog)._saveClicked();
    await dialog.updateComplete;

    expect(dialog.isConnected).toBe(true);
    expect(dialog.shadowRoot!.querySelector("ha-alert")?.textContent).toBe(
      "Nope"
    );
    expect(getInternals(dialog)._waiting).toBe(false);
  });

  it.each([
    ["succeeds", (action: Deferred<undefined>) => action.resolve(undefined)],
    [
      "fails",
      (action: Deferred<undefined>) => action.reject(new Error("Late")),
    ],
  ])(
    "leaves a dialog closed during the action alone when it %s",
    async (_outcome, finish) => {
      const action = deferred<undefined>();
      const dialog = await openFormDialog(() => action.promise);
      const closed = vi.fn();
      dialog.addEventListener("dialog-closed", closed);

      const saving = getInternals(dialog)._saveClicked();
      await dialog.closeDialog();
      finish(action);
      await saving;

      expect(closed).toHaveBeenCalledTimes(1);
      expect(getInternals(dialog)._error).toBeUndefined();
    }
  );

  it("unsubscribes from errors once closed", async () => {
    const unsubscribe = vi.fn();
    const connection = mockConnection();
    connection.subscribeMessage.mockResolvedValue(unsubscribe);
    const dialog = await openFormDialog(undefined, connection);
    await settle(dialog);

    await dialog.closeDialog();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when closed before the subscription came in", async () => {
    const unsubscribe = vi.fn();
    const subscription = deferred<() => void>();
    const connection = mockConnection();
    connection.subscribeMessage.mockReturnValue(subscription.promise as never);
    const dialog = await openFormDialog(undefined, connection);

    await dialog.closeDialog();
    subscription.resolve(unsubscribe);
    await settle(dialog);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

const openCustomRepositoriesDialog = (
  sendMessagePromise: SendMessage,
  githubConnected = true
): Promise<DialogMarketplaceCustomRepositories> =>
  openDialog(
    "dialog-marketplace-custom-repositories",
    { marketplace: marketplaceData(githubConnected) },
    mockConnection(sendMessagePromise)
  );

describe("dialog-marketplace-custom-repositories", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("leaves a dialog closed while removing a repository alone", async () => {
    const repositories = deferred<RepositoryBase[]>();
    const dialog = await openCustomRepositoriesDialog(async (message) =>
      message.type === "marketplace/repositories/list"
        ? repositories.promise
        : null
    );
    const refresh = vi.fn();
    window.addEventListener("marketplace-refresh", refresh);

    const removing = getInternals(dialog)._removeRepository("1");
    await dialog.closeDialog();
    repositories.resolve([]);
    await removing;
    window.removeEventListener("marketplace-refresh", refresh);

    // The panel still refetches, the closed dialog keeps its list.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getInternals(dialog)._repositories).toEqual([REPOSITORY]);
    expect(getInternals(dialog)._errors).toBeUndefined();
  });

  it("offers no removal for a downloaded repository", async () => {
    const dialog = await openCustomRepositoriesDialog(async () => null);
    getInternals(dialog)._repositories = [
      REPOSITORY,
      { ...REPOSITORY, id: "2", installed: true },
    ];
    await dialog.updateComplete;

    expect(
      [
        ...dialog.shadowRoot!.querySelectorAll<HTMLElement>(
          "ha-icon-button[data-repository-id]"
        ),
      ].map((button) => button.dataset.repositoryId)
    ).toEqual(["1"]);
  });

  it("leaves a dialog closed while adding a repository alone", async () => {
    const added = deferred<null>();
    const dialog = await openCustomRepositoriesDialog(async (message) =>
      message.type === "marketplace/repositories/add" ? added.promise : null
    );
    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };

    const adding = getInternals(dialog)._addRepository();
    await dialog.closeDialog();
    added.reject({ code: "unknown_error", message: "Late" });
    await adding;

    expect(getInternals(dialog)._errors).toEqual({});
  });

  it("shows the added repository once the backend has it", async () => {
    const added = { ...REPOSITORY, id: "2", full_name: "owner/other" };
    const sendMessagePromise = vi.fn<SendMessage>(async (message) =>
      message.type === "marketplace/repositories/list"
        ? [REPOSITORY, added]
        : {}
    );
    const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };

    await getInternals(dialog)._addRepository();

    expect(getInternals(dialog)._repositories).toEqual([REPOSITORY, added]);
    expect(getInternals(dialog)._errors).toEqual({});
  });

  it("shows why the backend refused to add a repository", async () => {
    const dialog = await openCustomRepositoriesDialog(async (message) => {
      if (message.type === "marketplace/repositories/add") {
        throw {
          code: "repository_exists",
          message: "owner/repository is already in the Marketplace",
        };
      }
      return null;
    });
    getInternals(dialog)._data = {
      repository: "owner/repository",
      category: "integration",
    };

    await getInternals(dialog)._addRepository();

    expect(getInternals(dialog)._errors).toEqual({
      base: "owner/repository is already in the Marketplace",
    });
  });

  it("connects GitHub first and then adds what was typed", async () => {
    const sendMessagePromise = vi.fn<SendMessage>(async (message) =>
      message.type === "marketplace/repositories/list" ? [] : null
    );
    const dialog = await openCustomRepositoriesDialog(
      sendMessagePromise,
      false
    );
    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };

    await getInternals(dialog)._addRepository();

    expect(showConnectGitHubFlow).toHaveBeenCalledWith(
      dialog,
      expect.objectContaining({ localize: expect.any(Function) })
    );
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repositories/add",
      repository: "owner/other",
      category: "integration",
    });
  });

  it("adds nothing when the dialog closed during the connect flow", async () => {
    const connected = deferred<boolean>();
    vi.mocked(showConnectGitHubFlow).mockReturnValueOnce(connected.promise);
    const sendMessagePromise = vi.fn<SendMessage>(async (message) =>
      message.type === "marketplace/repositories/list" ? [] : null
    );
    const dialog = await openCustomRepositoriesDialog(
      sendMessagePromise,
      false
    );
    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };

    const adding = getInternals(dialog)._addRepository();
    await dialog.closeDialog();
    connected.resolve(true);
    await adding;

    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "marketplace/repositories/add" })
    );
  });
});
