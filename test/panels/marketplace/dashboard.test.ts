import { afterEach, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../../src/types";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import "../../../src/panels/marketplace/dashboards/ha-marketplace-dashboard";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("@home-assistant/webawesome/dist/components/divider/divider", () =>
  stubElement("wa-divider")
);
vi.mock("../../../src/layouts/hass-tabs-subpage-data-table", () =>
  stubElement("hass-tabs-subpage-data-table")
);
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-dropdown", () =>
  stubElement("ha-dropdown")
);
vi.mock("../../../src/components/ha-dropdown-item", () =>
  stubElement("ha-dropdown-item")
);
vi.mock("../../../src/components/ha-form/ha-form", () =>
  stubElement("ha-form")
);
vi.mock("../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock(
  "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu",
  () => ({ repositoryMenuItems: () => [] })
);

const openDashboard = async (repositories: unknown[] = []) => {
  const dashboard = document.createElement("ha-marketplace-dashboard");
  dashboard.hass = { localize: (key: string) => key } as HomeAssistant;
  dashboard.marketplace = {
    repositories,
    info: { categories: [] },
  } as unknown as MarketplaceData;
  document.body.append(dashboard);
  await dashboard.updateComplete;
  return dashboard;
};

afterEach(() => document.body.replaceChildren());

it("shows its title from the translations of the Marketplace itself", async () => {
  const dashboard = await openDashboard();
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as HTMLElement & { tabs: { translationKey: string }[] };

  // A direct visit loads the Marketplace translations, not those of Settings
  expect(table.tabs.map((tab) => tab.translationKey)).toEqual([
    "ui.panel.marketplace.title",
  ]);
});

it("remembers choosing no grouping when the Marketplace opens again", async () => {
  const dashboard = await openDashboard();
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  )!;
  table.dispatchEvent(
    new CustomEvent("grouping-changed", { detail: { value: "" } })
  );
  await dashboard.updateComplete;
  expect(
    JSON.parse(localStorage.getItem("marketplace-dashboard-table-grouping")!)
  ).toBe("");
  dashboard.remove();
  const reopened = await openDashboard();
  const reopenedTable = reopened.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as HTMLElement & { initialGroupColumn: string };
  expect(reopenedTable.initialGroupColumn).toBe("");
});

it("offers dismissing new repositories the filter hides", async () => {
  const dashboard = await openDashboard([
    {
      id: "1",
      name: "New",
      full_name: "owner/new",
      category: "integration",
      status: "new",
      new: true,
    },
  ]);
  const filtered = dashboard as unknown as { _activeFilters: string[] };
  filtered._activeFilters = ["status_installed"];
  await dashboard.updateComplete;

  expect(
    dashboard.shadowRoot!.querySelector('ha-dropdown-item[value="dismiss_new"]')
  ).not.toBeNull();
  filtered._activeFilters = [];
});

it("remembers the search for this session", async () => {
  const dashboard = await openDashboard();
  dashboard
    .shadowRoot!.querySelector("hass-tabs-subpage-data-table")!
    .dispatchEvent(
      new CustomEvent("search-changed", { detail: { value: "spook" } })
    );
  await dashboard.updateComplete;

  expect(
    JSON.parse(sessionStorage.getItem("marketplace-dashboard-table-search")!)
  ).toBe("spook");
});
