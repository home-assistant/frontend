import { afterEach, describe, expect, it, vi } from "vitest";
import { navigate } from "../../../src/common/navigate";
import { showConfigFlowDialog } from "../../../src/dialogs/config-flow/show-dialog-config-flow";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import { ERROR_GITHUB_RATE_LIMITED } from "../../../src/data/marketplace/websocket";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-install";
import type { DialogMarketplaceInstall } from "../../../src/panels/marketplace/dialogs/dialog-marketplace-install";
import type { MarketplaceInstallDialogParams } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-install";
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
vi.mock("../../../src/common/navigate", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  navigate: vi.fn(),
}));
vi.mock("../../../src/dialogs/config-flow/show-dialog-config-flow", () => ({
  showConfigFlowDialog: vi.fn(),
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
    can_install: true,
    homeassistant: null,
    ...extra,
  }) as unknown as RepositoryInfo;

const release = (tag: string): Release => ({
  tag,
  name: tag,
  published_at: "2026-01-01T00:00:00Z",
  prerelease: false,
});

const openInstallDialog = (
  params: Partial<MarketplaceInstallDialogParams>,
  connection: MockConnection
): Promise<DialogMarketplaceInstall> =>
  openDialog(
    "dialog-marketplace-install",
    { marketplace: MARKETPLACE, repositoryId: "1", ...params },
    connection
  );

describe("dialog-marketplace-install", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.mocked(showConfirmationDialog).mockClear();
  });

  it("asks to reload after installing a plugin, also when closed meanwhile", async () => {
    const app = document.createElement("home-assistant");
    document.body.appendChild(app);
    const install = deferred<null>();
    const dialog = await openInstallDialog(
      { repository: repositoryInfo("1", { category: "plugin" }) },
      mockConnection(async (message: { type: string }) =>
        message.type === "marketplace/repository/install"
          ? install.promise
          : null
      )
    );
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await dialog.closeDialog();
    await settle(dialog);
    install.resolve(null);
    await settle(dialog);

    // The closed dialog is gone, the app shows the prompt instead
    expect(dialog.isConnected).toBe(false);
    expect(showConfirmationDialog).toHaveBeenCalledWith(app, expect.anything());
  });

  it.each([
    {
      name: "a new integration it can set up right away",
      installed: false,
      written: { config_flow: true, status: "installed" },
      flows: ["example"],
    },
    {
      name: "an update",
      installed: true,
      written: { config_flow: true, status: "installed" },
      flows: [],
    },
    {
      name: "an integration waiting for a restart",
      installed: false,
      written: { config_flow: true, status: "pending-restart" },
      flows: [],
    },
  ])(
    "starts setting up $name: $flows",
    async ({ installed, written, flows }) => {
      const dialog = await openInstallDialog(
        { repository: repositoryInfo("1", { installed, domain: "example" }) },
        mockConnection(async (message: { type: string }) =>
          message.type === "marketplace/repository/info"
            ? repositoryInfo("1", {
                installed: true,
                domain: "example",
                ...written,
              } as Partial<RepositoryInfo>)
            : null
        )
      );
      await settle(dialog);

      dialog
        .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
        .dispatchEvent(new Event("click"));
      await settle(dialog);
      await settle(dialog);

      expect(
        vi
          .mocked(showConfigFlowDialog)
          .mock.calls.map(([, params]) => params.startFlowHandler)
      ).toEqual(flows);
      // Installing was the ask, there is no second question
      expect(showConfirmationDialog).not.toHaveBeenCalled();
      vi.mocked(showConfigFlowDialog).mockClear();
    }
  );

  it("points at the documentation of an integration without a setup", async () => {
    const dialog = await openInstallDialog(
      {
        repository: repositoryInfo("1", {
          installed: false,
          domain: "example",
        }),
      },
      mockConnection(async (message: { type: string }) =>
        message.type === "marketplace/repository/info"
          ? repositoryInfo("1", {
              installed: true,
              domain: "example",
              config_flow: false,
              status: "pending-restart",
            } as Partial<RepositoryInfo>)
          : null
      )
    );
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await settle(dialog);
    await settle(dialog);

    expect(showConfigFlowDialog).not.toHaveBeenCalled();
    const params = vi.mocked(showConfirmationDialog).mock.lastCall![1];
    expect(params.title).toBe(
      "ui.panel.marketplace.dialog_install.installed_title"
    );
    expect(params.text).toBe(
      "ui.panel.marketplace.dialog_install.installed_without_set_up"
    );
    expect(params.confirmText).toBe(
      "ui.panel.marketplace.dialog_install.view_documentation"
    );

    params.confirm!();
    expect(navigate).toHaveBeenCalledWith("/marketplace/repository/1");
  });

  it.each([
    {
      name: "an update",
      installed: true,
      intro: "ui.panel.marketplace.dialog_install.update_intro",
      button: "ui.common.update",
    },
    {
      name: "a first installation",
      installed: false,
      intro: "ui.panel.marketplace.dialog_install.install_intro",
      button: "ui.panel.marketplace.common.install",
    },
  ])("says what $name does", async ({ installed, intro, button }) => {
    const dialog = await openInstallDialog(
      {
        repository: repositoryInfo("1", {
          installed,
          installed_version: "0.9.0",
        }),
      },
      mockConnection()
    );
    await settle(dialog);
    const root = dialog.shadowRoot!;

    expect(root.querySelector(".content p")!.textContent!.trim()).toBe(intro);
    expect(
      root.querySelector("ha-button[slot=primaryAction]")!.textContent!.trim()
    ).toBe(button);
    // Where the files land is not something to decide an installation on
    expect(root.textContent).not.toContain("/config/custom_components");
    // Choosing another version is a menu entry of its own
    expect(root.querySelector("ha-select")).toBeNull();
  });

  it("reinstalls the installed version, not the newest", async () => {
    const connection = mockConnection(async () => null);
    const dialog = await openInstallDialog(
      {
        reinstall: true,
        repository: repositoryInfo("1", { installed_version: "0.9.0" }),
      },
      connection
    );
    await settle(dialog);
    const root = dialog.shadowRoot!;

    expect(root.querySelector(".content p")!.textContent!.trim()).toBe(
      "ui.panel.marketplace.dialog_install.reinstall_intro"
    );
    const button = root.querySelector("ha-button[slot=primaryAction]")!;
    expect(button.textContent!.trim()).toBe(
      "ui.panel.marketplace.repository_menu.reinstall"
    );

    button.dispatchEvent(new Event("click"));
    await settle(dialog);

    expect(connection.sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "marketplace/repository/install",
        version: "0.9.0",
      })
    );
  });

  it("shows how far the installation of its repository is", async () => {
    const install = deferred<null>();
    const unsubscribe = vi.fn();
    let progress!: (data: Record<string, unknown>) => void;
    const connection = mockConnection(async (message: { type: string }) =>
      message.type === "marketplace/repository/install" ? install.promise : null
    );
    connection.subscribeMessage.mockImplementation((async (
      callback: (data: Record<string, unknown>) => void
    ) => {
      progress = callback;
      return unsubscribe;
    }) as never);
    const dialog = await openInstallDialog(
      { repository: repositoryInfo("1") },
      connection
    );
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await settle(dialog);
    const bar = () =>
      dialog.shadowRoot!.querySelector("ha-progress-bar") as HTMLElement & {
        value?: number;
        indeterminate?: boolean;
      };
    expect(bar().indeterminate).toBe(true);
    // Closing does not stop it, so it is not called cancelling
    expect(
      dialog
        .shadowRoot!.querySelector("ha-button[slot=secondaryAction]")!
        .textContent!.trim()
    ).toBe("ui.common.close");

    progress({ repository: "owner/repository-1", progress: 50 });
    progress({ repository: "owner/another", progress: 90 });
    await settle(dialog);
    expect(bar().value).toBe(50);
    expect(bar().indeterminate).toBe(false);

    install.resolve(null);
    await settle(dialog);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("offers nothing for a rate limit once closed", async () => {
    const install = deferred<null>();
    const dialog = await openInstallDialog(
      { repository: repositoryInfo("1") },
      mockConnection(async (message: { type: string }) =>
        message.type === "marketplace/repository/install"
          ? install.promise
          : null
      )
    );
    await settle(dialog);

    dialog
      .shadowRoot!.querySelector("ha-button[slot=primaryAction]")!
      .dispatchEvent(new Event("click"));
    await dialog.closeDialog();
    install.reject({ code: ERROR_GITHUB_RATE_LIMITED, message: "Limited" });
    await settle(dialog);

    // The prompt would open from the detached dialog, where nobody sees it
    expect(showConfirmationDialog).not.toHaveBeenCalled();
  });

  it("shows why the repository could not load, without a spinner", async () => {
    const dialog = await openInstallDialog(
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
    const dialog = await openInstallDialog(
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
    const dialog = await openInstallDialog(
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

  it("lists the releases of the repository it shows", async () => {
    const dialog = await openInstallDialog(
      {
        repositoryId: "2",
        repository: repositoryInfo("2"),
        chooseVersion: true,
      },
      mockConnection(async (message) =>
        message.type === "marketplace/repository/releases"
          ? [release(`v${message.repository_id}`)]
          : null
      )
    );
    await settle(dialog);

    expect(
      getInternals(dialog.shadowRoot!.querySelector("ha-select")!).options
    ).toEqual([expect.objectContaining({ value: "v2" })]);
  });

  it("tells a failed release list once, next to the versions with a retry", async () => {
    let fails = true;
    const dialog = await openInstallDialog(
      { repository: repositoryInfo("1"), chooseVersion: true },
      mockConnection(async (message) => {
        if (message.type !== "marketplace/repository/releases") {
          return null;
        }
        if (fails) {
          throw { code: "unknown_error", message: "Connection lost" };
        }
        return [release("v1")];
      })
    );
    await settle(dialog);

    expect(getInternals(dialog)._releasesFailed).toBe(true);
    expect(getInternals(dialog)._error).toBeUndefined();

    fails = false;
    await getInternals(dialog)._loadReleases();
    await settle(dialog);

    expect(getInternals(dialog)._releasesFailed).toBe(false);
    expect(getInternals(dialog)._error).toBeUndefined();
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
      const dialog = await openInstallDialog(
        { repository: repositoryInfo("1"), chooseVersion: true },
        mockConnection(async (message) =>
          message.type === "marketplace/repository/releases"
            ? releases.promise
            : null
        )
      );

      await dialog.closeDialog();
      finish(releases);
      await settle(dialog);

      expect(getInternals(dialog)._releases).toBeUndefined();
      expect(getInternals(dialog)._releasesFailed).toBe(false);
      expect(getInternals(dialog)._error).toBeUndefined();
    }
  );

  it("offers an older release when the newest needs a newer Home Assistant", async () => {
    const dialog = await openInstallDialog(
      {
        repository: repositoryInfo("1", {
          available_version: "2.0.0",
          can_install: false,
          homeassistant: "9999.1.0",
        }),
      },
      mockConnection(async (message) =>
        message.type === "marketplace/repository/releases"
          ? [release("2.0.0"), release("1.0.0")]
          : null
      )
    );
    // The newest one needs a newer Home Assistant, so the versions show on their own
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
    const dialog = await openInstallDialog(
      {
        repository: repositoryInfo("1", {
          can_install: false,
          homeassistant: "2099.1.0",
        }),
      },
      mockConnection(async (message) =>
        message.type === "marketplace/repository/releases" ? [] : null
      )
    );
    const root = dialog.shadowRoot!;

    expect(
      root.querySelector("ha-alert")?.textContent?.trim().split(/\s+/)
    ).toEqual([
      "ui.panel.marketplace.repository.requires_homeassistant",
      "ui.panel.marketplace.dialog_install.older_version_hint",
    ]);
    expect(
      root
        .querySelector('ha-button[slot="primaryAction"]')!
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("gates a first installation that replaces a built-in integration", async () => {
    const dialog = await openInstallDialog(
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
    const install = () =>
      root.querySelector('ha-button[slot="primaryAction"]')!;

    expect(root.querySelector("ha-alert.replaces-built-in")).not.toBeNull();
    expect(install().hasAttribute("disabled")).toBe(true);

    const checkbox = root.querySelector<HTMLInputElement>(
      "ha-alert.replaces-built-in ha-checkbox"
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await dialog.updateComplete;

    expect(install().hasAttribute("disabled")).toBe(false);
  });

  it("sends the confirmation along with the installation", async () => {
    // After the installation the dialog asks the backend what was written
    const sendMessagePromise = vi.fn(async (message: { type: string }) =>
      message.type === "marketplace/repository/info"
        ? repositoryInfo("1", { installed: true, status: "pending-restart" })
        : null
    );
    const dialog = await openInstallDialog(
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
        type: "marketplace/repository/install",
        repository: "1",
        confirm_replace_built_in: true,
      })
    );
  });

  it("keeps warning on an update, without asking again", async () => {
    const dialog = await openInstallDialog(
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
    const dialog = await openInstallDialog(
      { repository: repositoryInfo("1", { installed: false }) },
      mockConnection()
    );

    expect(
      dialog.shadowRoot!.querySelector("ha-alert.replaces-built-in")
    ).toBeNull();
  });
});
