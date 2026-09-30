import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../src/data/config_entries";
import type { ConfigEntry } from "../../../src/data/config_entries";
import { uninstallMarketplaceRepository } from "../../../src/data/marketplace/repository";
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
  uninstallMarketplaceRepository: vi.fn(),
}));

const localize = ((key: string) => key) as LocalizeFunc;

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
  it.each([
    ["an install", {}],
    ["a reinstall", { installed_version: "1.0.0" }],
  ])("offers %s when Home Assistant is new enough", (_offer, extra) => {
    expect(
      menuValues(repositoryMenuItems(PAGE, repository(extra), localize))
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
            repository({ ...extra, can_install: false }),
            localize
          )
        )
      ).toContain("install");
    }
  );

  it("opens the versions to choose from for another version", () => {
    const entry = repositoryMenuItems(PAGE, repository({}), localize).find(
      (item) => "value" in item && item.value === "install_other_version"
    ) as { action: () => void };

    entry.action();

    expect(showMarketplaceInstallDialog).toHaveBeenCalledWith(
      PAGE,
      expect.objectContaining({ repositoryId: "1", chooseVersion: true })
    );
  });

  const confirmUninstall = async () => {
    const entry = repositoryMenuItems(
      PAGE,
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
    expect(uninstallMarketplaceRepository).toHaveBeenCalledWith(PAGE.hass, "1");
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

    afterEach(() => {
      vi.clearAllMocks();
    });

    const uninstallIntegration = async () => {
      const entry = repositoryMenuItems(
        PAGE,
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

      expect(getConfigEntries).toHaveBeenCalledWith(PAGE.hass, {
        domain: "example",
      });
      expect(showMarketplaceInUseDialog).toHaveBeenCalledWith(
        PAGE,
        expect.objectContaining({ entries: ENTRIES })
      );
      expect(showConfirmationDialog).not.toHaveBeenCalled();
      expect(uninstallMarketplaceRepository).not.toHaveBeenCalled();
    });

    it("deletes every entry before it uninstalls", async () => {
      vi.mocked(getConfigEntries).mockResolvedValueOnce(ENTRIES);
      await uninstallIntegration();
      const params = vi.mocked(showMarketplaceInUseDialog).mock
        .lastCall![1] as MarketplaceInUseDialogParams;

      await params.deleteAndUninstall();

      expect(
        vi.mocked(deleteConfigEntry).mock.calls.map(([, entryId]) => entryId)
      ).toEqual(["a", "b"]);
      expect(uninstallMarketplaceRepository).toHaveBeenCalledWith(
        PAGE.hass,
        "1"
      );
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
