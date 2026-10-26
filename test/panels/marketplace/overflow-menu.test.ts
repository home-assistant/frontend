import { describe, expect, it, vi } from "vitest";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../src/data/config_entries";
import type { ConfigEntry } from "../../../src/data/config_entries";
import {
  refreshMarketplaceRepository,
  uninstallMarketplaceRepository,
} from "../../../src/data/marketplace/repository";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { showMarketplaceInUseDialog } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-in-use";
import type { MarketplaceInUseDialogParams } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-in-use";
import { showMarketplaceInstallDialog } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-install";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import type { MarketplaceRepositoryMenuEntry } from "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu";
import { repositoryMenuItems } from "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu";
import type { HaMarketplaceRepositoryDashboard } from "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";
import type { MarketplaceApi } from "../../../src/panels/marketplace/tools/connect-github";

vi.mock(
  "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-install",
  () => ({
    showMarketplaceInstallDialog: vi.fn(),
  })
);
vi.mock(
  "../../../src/panels/marketplace/dialogs/show-dialog-marketplace-in-use",
  () => ({
    showMarketplaceInUseDialog: vi.fn(),
  })
);
vi.mock("../../../src/data/config_entries", () => ({
  deleteConfigEntry: vi.fn(async () => ({ require_restart: false })),
  getConfigEntries: vi.fn(async () => []),
}));
vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
}));
vi.mock("../../../src/data/marketplace/repository", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  refreshMarketplaceRepository: vi.fn(),
  uninstallMarketplaceRepository: vi.fn(),
}));

const localize = ((key: string) => key) as LocalizeFunc;

const API: MarketplaceApi = { callApi: vi.fn(), callWS: vi.fn() };

const PAGE = {
  nodeName: "HA-MARKETPLACE-REPOSITORY-DASHBOARD",
} as unknown as HaMarketplaceRepositoryDashboard;

const menuValues = (entries: MarketplaceRepositoryMenuEntry[]) =>
  entries.flatMap((entry) => ("value" in entry ? [entry.value] : []));

const repository = (extra: Partial<RepositoryBase>) =>
  ({
    id: "1",
    full_name: "owner/repository",
    category: "integration",
    installed_version: "",
    can_install: true,
    ...extra,
  }) as RepositoryBase;

describe("repositoryMenuItems", () => {
  it("links the issue tracker, and not the resource file of a card", () => {
    const entries = repositoryMenuItems(
      PAGE,
      API,
      repository({ category: "plugin", installed_version: "1.0.0" }),
      localize
    ).filter((entry) => "value" in entry);

    expect(menuValues(entries)).not.toContain("open_source");
    expect(
      entries.find(
        (entry) => "value" in entry && entry.value === "issue_tracker"
      )
    ).toMatchObject({
      label: "ui.panel.marketplace.repository_menu.issue_tracker",
    });
  });

  it.each([
    ["an install", {}],
    ["a reinstall", { installed_version: "1.0.0" }],
  ])("offers %s when Home Assistant is new enough", (_offer, extra) => {
    expect(
      menuValues(repositoryMenuItems(PAGE, API, repository(extra), localize))
    ).toContain("install");
  });

  // The dialog refuses only the newest version, an older one can still fit.
  it.each([
    ["an install", {}],
    ["a reinstall", { installed_version: "1.0.0" }],
  ])(
    "offers %s when Home Assistant is too old for the newest",
    (_offer, extra) => {
      expect(
        menuValues(
          repositoryMenuItems(
            PAGE,
            API,
            repository({ ...extra, can_install: false }),
            localize
          )
        )
      ).toContain("install");
    }
  );

  it("reinstalls the installed version", () => {
    const entry = repositoryMenuItems(
      PAGE,
      API,
      repository({ installed_version: "1.0.0" }),
      localize
    ).find((item) => "value" in item && item.value === "install") as {
      action: () => void;
    };

    entry.action();

    expect(showMarketplaceInstallDialog).toHaveBeenCalledWith(
      PAGE,
      expect.objectContaining({ repositoryId: "1", reinstall: true })
    );
  });

  it("opens the versions to choose from for another version", () => {
    const entry = repositoryMenuItems(PAGE, API, repository({}), localize).find(
      (item) => "value" in item && item.value === "install_other_version"
    ) as { action: () => void };

    entry.action();

    expect(showMarketplaceInstallDialog).toHaveBeenCalledWith(
      PAGE,
      expect.objectContaining({ repositoryId: "1", chooseVersion: true })
    );
  });

  const updateInformation = async (page: HaMarketplaceRepositoryDashboard) => {
    const entry = repositoryMenuItems(page, API, repository({}), localize).find(
      (item) => "value" in item && item.value === "update_information"
    ) as unknown as { action: () => Promise<void> };
    await entry.action();
  };

  it("reloads the repository page after updating its information", async () => {
    const page = {
      ...PAGE,
      reloadRepository: vi.fn(),
    } as unknown as HaMarketplaceRepositoryDashboard;

    await updateInformation(page);

    expect(refreshMarketplaceRepository).toHaveBeenCalledWith(API, "1");
    expect(page.reloadRepository).toHaveBeenCalledTimes(1);
  });

  it("keeps the repository page when updating its information fails", async () => {
    vi.mocked(refreshMarketplaceRepository).mockRejectedValueOnce(
      new Error("Busy")
    );
    const page = {
      ...PAGE,
      reloadRepository: vi.fn(),
    } as unknown as HaMarketplaceRepositoryDashboard;

    await updateInformation(page);

    expect(page.reloadRepository).not.toHaveBeenCalled();
    expect(showAlertDialog).toHaveBeenCalled();
  });

  const confirmUninstall = async () => {
    const entry = repositoryMenuItems(
      PAGE,
      API,
      repository({ installed_version: "1.0.0", category: "theme" }),
      localize
    ).find(
      (item) => "value" in item && item.value === "uninstall"
    ) as unknown as {
      action: () => Promise<void>;
    };
    await entry.action();
    return vi.mocked(showConfirmationDialog).mock.lastCall![1];
  };

  it("asks before uninstalling and uninstalls once confirmed", async () => {
    const params = await confirmUninstall();

    await params.action!();

    expect(params.destructive).toBe(true);
    expect(uninstallMarketplaceRepository).toHaveBeenCalledWith(API, "1");
    expect(showAlertDialog).not.toHaveBeenCalled();
  });

  it("keeps the uninstall dialog open with an alert when it fails", async () => {
    const error = new Error("Busy");
    vi.mocked(uninstallMarketplaceRepository).mockRejectedValueOnce(error);
    const params = await confirmUninstall();

    await expect(params.action!()).rejects.toBe(error);
    expect(showAlertDialog).toHaveBeenCalledTimes(1);
  });

  describe("an integration that is still set up", () => {
    const ENTRIES = [
      { entry_id: "a", domain: "example", title: "Home" },
      { entry_id: "b", domain: "example", title: "", source: "ignore" },
    ] as ConfigEntry[];

    const uninstallIntegration = async () => {
      const entry = repositoryMenuItems(
        PAGE,
        API,
        repository({ installed_version: "1.0.0", domain: "example" }),
        localize
      ).find(
        (item) => "value" in item && item.value === "uninstall"
      ) as unknown as { action: () => Promise<void> };
      await entry.action();
    };

    it("shows what is set up instead of uninstalling", async () => {
      vi.mocked(getConfigEntries).mockResolvedValueOnce(ENTRIES);

      await uninstallIntegration();

      expect(getConfigEntries).toHaveBeenCalledWith(API, {
        domain: "example",
      });
      expect(showMarketplaceInUseDialog).toHaveBeenCalledWith(
        PAGE,
        expect.objectContaining({ entries: ENTRIES })
      );
      expect(showConfirmationDialog).not.toHaveBeenCalled();
      expect(uninstallMarketplaceRepository).not.toHaveBeenCalled();
    });

    const deleteAndUninstall = async () => {
      vi.mocked(getConfigEntries).mockResolvedValueOnce(ENTRIES);
      await uninstallIntegration();
      const params = vi.mocked(showMarketplaceInUseDialog).mock
        .lastCall![1] as MarketplaceInUseDialogParams;
      return params.deleteAndUninstall;
    };

    it("deletes every entry before it uninstalls", async () => {
      const deleted: (() => void)[] = [];
      vi.mocked(deleteConfigEntry).mockImplementation(
        () =>
          new Promise((resolve) => {
            deleted.push(() => resolve({ require_restart: false }));
          })
      );
      const settle = () =>
        new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      const running = (await deleteAndUninstall())();

      await settle();
      expect(deleteConfigEntry).toHaveBeenCalledTimes(1);
      deleted[0]();
      await settle();
      expect(deleteConfigEntry).toHaveBeenCalledTimes(2);
      // Core refuses while an entry is left, so it waits for the last one
      expect(uninstallMarketplaceRepository).not.toHaveBeenCalled();
      deleted[1]();
      await running;

      expect(
        vi.mocked(deleteConfigEntry).mock.calls.map(([, entryId]) => entryId)
      ).toEqual(["a", "b"]);
      expect(uninstallMarketplaceRepository).toHaveBeenCalledWith(API, "1");
      vi.mocked(deleteConfigEntry).mockReset();
    });

    it("uninstalls nothing when an entry can not be deleted", async () => {
      const error = new Error("Busy");
      vi.mocked(deleteConfigEntry).mockRejectedValueOnce(error);

      await expect((await deleteAndUninstall())()).rejects.toBe(error);

      expect(deleteConfigEntry).toHaveBeenCalledTimes(1);
      expect(uninstallMarketplaceRepository).not.toHaveBeenCalled();
      expect(showAlertDialog).toHaveBeenCalledTimes(1);
    });

    it("says why when the entries can not be looked up", async () => {
      vi.mocked(getConfigEntries).mockRejectedValueOnce(new Error("Offline"));

      await uninstallIntegration();

      expect(showAlertDialog).toHaveBeenCalledTimes(1);
      expect(showMarketplaceInUseDialog).not.toHaveBeenCalled();
      expect(showConfirmationDialog).not.toHaveBeenCalled();
    });
  });
});
