import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-custom-repositories";
import type { DialogMarketplaceCustomRepositories } from "../../../src/panels/marketplace/dialogs/dialog-marketplace-custom-repositories";
import { showConnectGitHubFlow } from "../../../src/panels/marketplace/tools/connect-github";
import type * as ConnectGitHubModule from "../../../src/panels/marketplace/tools/connect-github";
import type { SendMessage } from "./dialog-host";
import {
  deferred,
  getInternals,
  mockConnection,
  openDialog,
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
vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
}));
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
  installed: false,
} as unknown as RepositoryBase;

const marketplaceData = (githubConnected = true) =>
  ({
    repositories: [REPOSITORY],
    info: { github_connected: githubConnected, categories: ["integration"] },
  }) as unknown as MarketplaceData;

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

  it("explains adding from a GitHub link, and what each field wants", async () => {
    const dialog = await openCustomRepositoriesDialog(async () => null);
    await dialog.updateComplete;
    const root = dialog.shadowRoot!;
    const internals = getInternals(dialog);

    expect(
      (root.querySelector("ha-dialog") as HTMLElement & { headerTitle: string })
        .headerTitle
    ).toBe("ui.panel.marketplace.dialog_custom_repositories.title");
    expect(root.querySelector("p.intro")!.textContent!.trim()).toBe(
      "ui.panel.marketplace.dialog_custom_repositories.intro"
    );
    expect(
      ["repository", "category"].map((name) => [
        internals._computeLabel({ name }),
        internals._computeHelper({ name }),
      ])
    ).toEqual([
      [
        "ui.panel.marketplace.dialog_custom_repositories.link",
        "ui.panel.marketplace.dialog_custom_repositories.link_helper",
      ],
      [
        "ui.panel.marketplace.dialog_custom_repositories.type",
        "ui.panel.marketplace.dialog_custom_repositories.type_helper",
      ],
    ]);
  });

  it("asks only for the link, the type is found out", async () => {
    const dialog = await openCustomRepositoriesDialog(async () => null);
    await dialog.updateComplete;
    const form = dialog.shadowRoot!.querySelector("ha-form") as unknown as {
      schema: { name: string }[];
    };

    expect(form.schema.map((field) => field.name)).toEqual(["repository"]);
  });

  it("adds what it recognises straight away", async () => {
    const sendMessagePromise = vi.fn<SendMessage>(async (message) => {
      if (message.type === "marketplace/repositories/detect") {
        return { categories: ["integration"] };
      }
      return message.type === "marketplace/repositories/list" ? [] : null;
    });
    const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
    getInternals(dialog)._data = { repository: "owner/other" };

    await getInternals(dialog)._addRepository();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "marketplace/repositories/add",
        repository: "owner/other",
        category: "integration",
      })
    );
    expect(getInternals(dialog)._detected).toBeUndefined();
  });

  it.each([
    {
      name: "nothing",
      detected: [],
      options: ["integration", "theme"],
      note: "ui.panel.marketplace.dialog_custom_repositories.type_unknown",
    },
    {
      name: "more than one thing",
      detected: ["integration", "theme"],
      options: ["integration", "theme"],
      note: "ui.panel.marketplace.dialog_custom_repositories.type_several",
    },
  ])(
    "asks what it is when it holds $name it recognises",
    async ({ detected, options, note }) => {
      const sendMessagePromise = vi.fn<SendMessage>(async (message) =>
        message.type === "marketplace/repositories/detect"
          ? { categories: detected }
          : null
      );
      const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
      dialog.params!.marketplace.info.categories = ["integration", "theme"];
      getInternals(dialog)._data = { repository: "owner/other" };

      await getInternals(dialog)._addRepository();
      await dialog.updateComplete;
      const root = dialog.shadowRoot!;
      const form = root.querySelector("ha-form") as unknown as {
        schema: {
          name: string;
          selector?: { select: { options: { value: string }[] } };
        }[];
      };

      // Nothing is added until it is told what it is
      expect(sendMessagePromise).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "marketplace/repositories/add" })
      );
      expect(root.querySelector(".type-unknown")!.textContent!.trim()).toBe(
        note
      );
      expect(form.schema.map((field) => field.name)).toEqual([
        "repository",
        "category",
      ]);
      expect(
        form.schema[1].selector!.select.options.map((option) => option.value)
      ).toEqual(options);
    }
  );

  it("adds with the type picked when it could not tell", async () => {
    const sendMessagePromise = vi.fn<SendMessage>(async (message) => {
      if (message.type === "marketplace/repositories/detect") {
        return { categories: [] };
      }
      return message.type === "marketplace/repositories/list" ? [] : null;
    });
    const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
    getInternals(dialog)._data = { repository: "owner/other" };
    await getInternals(dialog)._addRepository();

    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };
    await getInternals(dialog)._addRepository();

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "marketplace/repositories/add",
        category: "integration",
      })
    );
    expect(sendMessagePromise).toHaveBeenCalledTimes(
      // The detection and the add
      2
    );
  });

  it("adds nothing when the link changed while it was found out", async () => {
    const detected = deferred<{ categories: string[] }>();
    const sendMessagePromise = vi.fn<SendMessage>(async (message) =>
      message.type === "marketplace/repositories/detect"
        ? detected.promise
        : null
    );
    const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
    getInternals(dialog)._data = { repository: "owner/first" };

    const adding = getInternals(dialog)._addRepository();
    await dialog.updateComplete;
    const form = dialog.shadowRoot!.querySelector("ha-form") as unknown as {
      disabled: boolean;
    };
    // Nothing to change while it is busy, but a change still has to be safe
    expect(form.disabled).toBe(true);
    getInternals(dialog)._valueChanged(
      new CustomEvent("value-changed", {
        detail: { value: { repository: "owner/second" } },
      })
    );
    detected.resolve({ categories: ["integration"] });
    await adding;

    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "marketplace/repositories/add" })
    );
  });

  it("finds out the type again for another link", async () => {
    const dialog = await openCustomRepositoriesDialog(async (message) =>
      message.type === "marketplace/repositories/detect"
        ? { categories: [] }
        : null
    );
    getInternals(dialog)._data = { repository: "owner/other" };
    await getInternals(dialog)._addRepository();

    getInternals(dialog)._valueChanged(
      new CustomEvent("value-changed", {
        detail: { value: { repository: "owner/another" } },
      })
    );

    expect(getInternals(dialog)._detected).toBeUndefined();
    expect(getInternals(dialog)._data).toEqual({ repository: "owner/another" });
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

  it("closes once the repository is added", async () => {
    const sendMessagePromise = vi.fn<SendMessage>(async () => null);
    const dialog = await openCustomRepositoriesDialog(sendMessagePromise);
    getInternals(dialog)._data = {
      repository: "owner/other",
      category: "integration",
    };

    await getInternals(dialog)._addRepository();

    // The panel hears it from the backend and lists it on its page
    expect(dialog.isConnected).toBe(false);
    expect(getInternals(dialog)._errors).toEqual({});
    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "marketplace/repositories/list" })
    );
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
      expect.objectContaining({ callWS: expect.any(Function) }),
      expect.any(Function)
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
