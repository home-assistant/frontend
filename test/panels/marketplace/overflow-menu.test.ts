import { describe, expect, it, vi } from "vitest";
import { showMarketplaceDownloadDialog } from "../../../src/panels/marketplace/dialogs/show-dialog-marketplace";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import type { MarketplaceRepositoryMenuEntry } from "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu";
import { repositoryMenuItems } from "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu";
import type { HaMarketplaceRepositoryDashboard } from "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";

vi.mock(
  "../../../src/panels/marketplace/dialogs/show-dialog-marketplace",
  () => ({
    showMarketplaceDownloadDialog: vi.fn(),
    showMarketplaceFormDialog: vi.fn(),
  })
);

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
    can_download: true,
    ...extra,
  }) as RepositoryBase;

describe("repositoryMenuItems", () => {
  it.each([
    ["a download", {}],
    ["a redownload", { installed_version: "1.0.0" }],
  ])("offers %s when Home Assistant is new enough", (_offer, extra) => {
    expect(
      menuValues(repositoryMenuItems(PAGE, repository(extra), localize))
    ).toContain("download");
  });

  // The dialog refuses only the newest version, an older one can still fit.
  it.each([
    ["a download", {}],
    ["a redownload", { installed_version: "1.0.0" }],
  ])(
    "offers %s when Home Assistant is too old for the newest",
    (_offer, extra) => {
      expect(
        menuValues(
          repositoryMenuItems(
            PAGE,
            repository({ ...extra, can_download: false }),
            localize
          )
        )
      ).toContain("download");
    }
  );

  it("opens the versions to choose from for another version", () => {
    const entry = repositoryMenuItems(PAGE, repository({}), localize).find(
      (item) => "value" in item && item.value === "download_other_version"
    ) as { action: () => void };

    entry.action();

    expect(showMarketplaceDownloadDialog).toHaveBeenCalledWith(
      PAGE,
      expect.objectContaining({ repositoryId: "1", chooseVersion: true })
    );
  });
});
