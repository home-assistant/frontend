import { describe, expect, it, vi } from "vitest";
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

  it.each([
    ["a download", {}],
    ["a redownload", { installed_version: "1.0.0" }],
  ])("offers no %s when Home Assistant is too old", (_offer, extra) => {
    expect(
      menuValues(
        repositoryMenuItems(
          PAGE,
          repository({ ...extra, can_download: false }),
          localize
        )
      )
    ).not.toContain("download");
  });
});
