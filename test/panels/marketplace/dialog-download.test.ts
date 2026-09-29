import { afterEach, describe, expect, it, vi } from "vitest";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-download";
import type { DialogMarketplaceDownload } from "../../../src/panels/marketplace/dialogs/dialog-marketplace-download";
import type { MarketplaceDownloadDialogParams } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace";
import type { Deferred, MockConnection } from "./dialog-host";
import {
  deferred,
  getInternals,
  mockConnection,
  openDialog,
  settle,
} from "./dialog-host";

// The real components need more browser than jsdom has, the dialog only
// hands them properties.
const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showConfirmationDialog: vi.fn(async () => false),
}));
vi.mock("../../../src/components/ha-alert", () => stubElement("ha-alert"));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-checkbox", () =>
  stubElement("ha-checkbox")
);
vi.mock("../../../src/components/ha-dialog", async () => {
  (await import("./dialog-host")).defineClosingDialogStub();
  return {};
});
vi.mock("../../../src/components/ha-dialog-footer", () =>
  stubElement("ha-dialog-footer")
);
vi.mock("../../../src/components/ha-expansion-panel", () =>
  stubElement("ha-expansion-panel")
);
vi.mock("../../../src/components/ha-select", () => stubElement("ha-select"));
vi.mock("../../../src/components/ha-spinner", () => stubElement("ha-spinner"));
vi.mock("../../../src/components/progress/ha-progress-bar", () =>
  stubElement("ha-progress-bar")
);

interface Release {
  tag: string;
  name: string;
  published_at: string;
  prerelease: boolean;
}

const MARKETPLACE = {
  repositories: [],
  info: {},
} as unknown as MarketplaceData;

const repositoryInfo = (id: string, extra: Partial<RepositoryInfo> = {}) =>
  ({
    id,
    name: `Repository ${id}`,
    full_name: `owner/repository-${id}`,
    category: "integration",
    local_path: `/config/custom_components/repository_${id}`,
    installed: true,
    available_version: "1.0.0",
    version_or_commit: "version",
    can_download: true,
    homeassistant: null,
    ...extra,
  }) as unknown as RepositoryInfo;

const release = (tag: string): Release => ({
  tag,
  name: tag,
  published_at: "2026-01-01T00:00:00Z",
  prerelease: false,
});

const openDownloadDialog = (
  params: Partial<MarketplaceDownloadDialogParams>,
  connection: MockConnection
): Promise<DialogMarketplaceDownload> =>
  openDialog(
    "dialog-marketplace-download",
    { marketplace: MARKETPLACE, repositoryId: "1", ...params },
    connection
  );

const expandReleases = (dialog: DialogMarketplaceDownload) =>
  dialog
    .shadowRoot!.querySelector("ha-expansion-panel")!
    .dispatchEvent(
      new CustomEvent("expanded-changed", { detail: { expanded: true } })
    );

describe("dialog-marketplace-download", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.mocked(showConfirmationDialog).mockClear();
  });

  it("asks to reload after a plugin download, also when closed meanwhile", async () => {
    const app = document.createElement("home-assistant");
    document.body.appendChild(app);
    const download = deferred<null>();
    const dialog = await openDownloadDialog(
      { repository: repositoryInfo("1", { category: "plugin" }) },
      mockConnection(async (message: { type: string }) =>
        message.type === "marketplace/repository/download"
          ? download.promise
          : null
      )
    );
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await dialog.closeDialog();
    await settle(dialog);
    download.resolve(null);
    await settle(dialog);

    // The closed dialog is gone, the app shows the prompt instead
    expect(dialog.isConnected).toBe(false);
    expect(showConfirmationDialog).toHaveBeenCalledWith(app, expect.anything());
  });

  it("shows why the repository could not load, without a spinner", async () => {
    const dialog = await openDownloadDialog(
      {},
      mockConnection(async () => {
        throw { code: "unknown_error", message: "Broken" };
      })
    );
    await settle(dialog);
    const root = dialog.shadowRoot!;

    expect(root.querySelector("ha-spinner")).toBeNull();
    expect(root.querySelector("ha-alert")?.textContent).toBe("Broken");
    expect(root.querySelector("ha-dialog")!.headerTitle).toBe(
      "ui.panel.marketplace.dialog.error.title"
    );
  });

  it("closes from the footer after a failed load", async () => {
    const dialog = await openDownloadDialog(
      {},
      mockConnection(async () => {
        throw { code: "unknown_error", message: "Broken" };
      })
    );
    await settle(dialog);
    const closed = vi.fn();
    dialog.addEventListener("dialog-closed", closed);

    dialog
      .shadowRoot!.querySelector<HTMLElement>("ha-dialog-footer ha-button")!
      .click();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(dialog.isConnected).toBe(false);
  });

  it("shows a spinner while the repository loads", async () => {
    const dialog = await openDownloadDialog(
      {},
      mockConnection(
        () =>
          new Promise(() => {
            // Never answers.
          })
      )
    );

    expect(dialog.shadowRoot!.querySelector("ha-spinner")).not.toBeNull();
    expect(dialog.shadowRoot!.querySelector("ha-dialog-footer")).toBeNull();
  });

  it("unsubscribes from errors once closed", async () => {
    const unsubscribe = vi.fn();
    const connection = mockConnection();
    connection.subscribeMessage.mockResolvedValue(unsubscribe);
    const dialog = await openDownloadDialog(
      { repository: repositoryInfo("1") },
      connection
    );
    await settle(dialog);

    await dialog.closeDialog();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when closed before the subscription came in", async () => {
    const unsubscribe = vi.fn();
    const subscription = deferred<() => void>();
    const connection = mockConnection();
    connection.subscribeMessage.mockReturnValue(subscription.promise as never);
    const dialog = await openDownloadDialog(
      { repository: repositoryInfo("1") },
      connection
    );

    await dialog.closeDialog();
    subscription.resolve(unsubscribe);
    await settle(dialog);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("lists the releases of the repository it shows", async () => {
    const dialog = await openDownloadDialog(
      { repositoryId: "2", repository: repositoryInfo("2") },
      mockConnection(async (message) =>
        message.type === "marketplace/repository/releases"
          ? [release(`v${message.repository_id}`)]
          : null
      )
    );

    expandReleases(dialog);
    await settle(dialog);

    expect(
      getInternals(dialog.shadowRoot!.querySelector("ha-select")!).options
    ).toEqual([expect.objectContaining({ value: "v2" })]);
  });

  it.each([
    [
      "arrive",
      (releases: Deferred<Release[]>) => releases.resolve([release("v1")]),
    ],
    [
      "fail",
      (releases: Deferred<Release[]>) =>
        releases.reject({ code: "unknown_error", message: "Late" }),
    ],
  ])(
    "drops releases that %s after the dialog closed",
    async (_outcome, finish) => {
      const releases = deferred<Release[]>();
      const dialog = await openDownloadDialog(
        { repository: repositoryInfo("1") },
        mockConnection(async (message) =>
          message.type === "marketplace/repository/releases"
            ? releases.promise
            : null
        )
      );

      expandReleases(dialog);
      await dialog.closeDialog();
      finish(releases);
      await settle(dialog);

      expect(getInternals(dialog)._releases).toBeUndefined();
      expect(getInternals(dialog)._releasesFailed).toBe(false);
      expect(getInternals(dialog)._error).toBeUndefined();
    }
  );

  it("offers an older release when the newest needs a newer Home Assistant", async () => {
    const dialog = await openDownloadDialog(
      {
        repository: repositoryInfo("1", {
          available_version: "2.0.0",
          can_download: false,
          homeassistant: "9999.1.0",
        }),
      },
      mockConnection(async (message) =>
        message.type === "marketplace/repository/releases"
          ? [release("2.0.0"), release("1.0.0")]
          : null
      )
    );
    expandReleases(dialog);
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-select")!
      .dispatchEvent(
        new CustomEvent("selected", { detail: { value: "1.0.0" } })
      );
    await settle(dialog);

    expect(getInternals(dialog)._selectedVersion).toBe("1.0.0");
    expect(
      dialog
        .shadowRoot!.querySelector('ha-button[slot="primaryAction"]')!
        .hasAttribute("disabled")
    ).toBe(false);
  });

  it("does not offer the newest version Home Assistant is too old for", async () => {
    const dialog = await openDownloadDialog(
      {
        repository: repositoryInfo("1", {
          can_download: false,
          homeassistant: "2099.1.0",
        }),
      },
      mockConnection()
    );
    const root = dialog.shadowRoot!;

    expect(
      root.querySelector("ha-alert")?.textContent?.trim().split(/\s+/)
    ).toEqual([
      "ui.panel.marketplace.dialog_info.requires_homeassistant",
      "ui.panel.marketplace.dialog_download.older_version_hint",
    ]);
    expect(
      root
        .querySelector('ha-button[slot="primaryAction"]')!
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("gates a first download that replaces a built-in integration", async () => {
    const dialog = await openDownloadDialog(
      {
        repository: repositoryInfo("1", {
          installed: false,
          replaces_built_in: true,
          domain: "light",
        }),
      },
      mockConnection()
    );
    const root = dialog.shadowRoot!;
    const download = () =>
      root.querySelector('ha-button[slot="primaryAction"]')!;

    expect(root.querySelector("ha-alert.replaces-built-in")).not.toBeNull();
    expect(download().hasAttribute("disabled")).toBe(true);

    const checkbox = root.querySelector<HTMLInputElement>(
      "ha-alert.replaces-built-in ha-checkbox"
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await dialog.updateComplete;

    expect(download().hasAttribute("disabled")).toBe(false);
  });

  it("sends the confirmation along with the download", async () => {
    const sendMessagePromise = vi.fn(async () => null);
    const dialog = await openDownloadDialog(
      {
        repository: repositoryInfo("1", {
          installed: false,
          replaces_built_in: true,
          domain: "light",
        }),
      },
      mockConnection(sendMessagePromise)
    );
    const checkbox = dialog.shadowRoot!.querySelector<HTMLInputElement>(
      "ha-alert.replaces-built-in ha-checkbox"
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await dialog.updateComplete;

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await settle(dialog);

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "marketplace/repository/download",
        repository: "1",
        confirm_replace_built_in: true,
      })
    );
  });

  it("keeps warning on an update, without asking again", async () => {
    const dialog = await openDownloadDialog(
      {
        repository: repositoryInfo("1", {
          replaces_built_in: true,
          domain: "light",
        }),
      },
      mockConnection()
    );
    const root = dialog.shadowRoot!;

    expect(root.querySelector("ha-alert.replaces-built-in")).not.toBeNull();
    expect(root.querySelector("ha-checkbox")).toBeNull();
    expect(
      root
        .querySelector('ha-button[slot="primaryAction"]')!
        .hasAttribute("disabled")
    ).toBe(false);
  });

  it("does not warn for an integration of its own", async () => {
    const dialog = await openDownloadDialog(
      { repository: repositoryInfo("1", { installed: false }) },
      mockConnection()
    );

    expect(
      dialog.shadowRoot!.querySelector("ha-alert.replaces-built-in")
    ).toBeNull();
  });
});
