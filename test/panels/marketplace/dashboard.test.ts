import { render } from "lit";
import { afterEach, expect, it, vi } from "vitest";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { provideHass } from "../../../src/fake_data/provide_hass";
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
vi.mock("../../../src/layouts/hass-tabs-subpage", () =>
  stubElement("hass-tabs-subpage")
);
vi.mock(
  "../../../src/panels/marketplace/components/ha-marketplace-discover",
  () => stubElement("ha-marketplace-discover")
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
vi.mock("../../../src/components/ha-filter-states", () =>
  stubElement("ha-filter-states")
);
vi.mock("../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock(
  "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu",
  () => ({ repositoryMenuItems: () => [], renderRepositoryMenuEntry: vi.fn() })
);

let host: HTMLDivElement;

let hass: MockHomeAssistant;

const openDashboard = async (
  repositories: unknown[] = [],
  tab: "discover" | "browse" | "installed" = "browse"
) => {
  host = document.createElement("div");
  hass = provideHass(host, { localize: (key: string) => key });
  document.body.append(host);
  const dashboard = document.createElement("ha-marketplace-dashboard");
  dashboard.tab = tab;
  dashboard.marketplace = {
    repositories,
    info: { categories: [] },
  } as unknown as MarketplaceData;
  host.append(dashboard);
  await dashboard.updateComplete;
  return dashboard;
};

afterEach(() => document.body.replaceChildren());

it("shows its tabs from the translations of the Marketplace itself", async () => {
  const dashboard = await openDashboard();
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as HTMLElement & { tabs: { translationKey: string; path: string }[] };

  // A direct visit loads the Marketplace translations, not those of Settings
  expect(table.tabs.map((tab) => [tab.translationKey, tab.path])).toEqual([
    ["ui.panel.marketplace.tabs.discover", "/marketplace/discover"],
    ["ui.panel.marketplace.tabs.browse", "/marketplace/browse"],
    ["ui.panel.marketplace.tabs.installed", "/marketplace/installed"],
  ]);
  expect(
    (table.tabs as unknown as { iconPath?: string }[]).every(
      (tab) => tab.iconPath
    )
  ).toBe(true);
});

it("offers no grouping", async () => {
  const dashboard = await openDashboard();
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as {
    columns: Record<string, { groupable?: boolean }>;
    initialGroupColumn?: string;
  };

  // The table only offers to group by a column that allows it
  expect(Object.values(table.columns).some((column) => column.groupable)).toBe(
    false
  );
  expect(table.initialGroupColumn).toBeUndefined();
});

it("counts what the search looks through, on the tab it is on", async () => {
  const repositories = [
    { id: "1", name: "One", category: "integration", installed: true },
    { id: "2", name: "Two", category: "integration", installed: false },
  ];
  const dashboard = await openDashboard(repositories, "installed");
  const localize = vi.fn((key: string) => key);
  hass.updateHass({ localize });
  await dashboard.updateComplete;

  expect(localize).toHaveBeenCalledWith(
    "ui.panel.marketplace.dashboard.search",
    {
      number: 1,
    }
  );
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as { searchLabel: string };
  expect(table.searchLabel).toBe("ui.panel.marketplace.dashboard.search");
});

it.each([
  { name: "marks", installed: true, marked: true },
  { name: "does not mark", installed: false, marked: false },
])("$name the icon of what is installed", async ({ installed, marked }) => {
  const repository = {
    id: "1",
    name: "One",
    category: "plugin",
    installed,
  };
  const dashboard = await openDashboard([repository]);
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as {
    columns: { icon: { template: (row: unknown) => unknown } };
  };
  const cell = document.createElement("div");

  render(table.columns.icon.template(repository), cell);

  const badge = cell.querySelector(".installed-badge");
  expect(badge !== null).toBe(marked);
  // Said, not only shown
  expect(badge?.getAttribute("aria-label") ?? null).toBe(
    marked ? "ui.panel.marketplace.repository_status.installed" : null
  );
});

it("does not mark what is installed on the installed tab", async () => {
  const repository = {
    id: "1",
    name: "One",
    category: "plugin",
    installed: true,
  };
  const dashboard = await openDashboard([repository], "installed");
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as {
    columns: { icon: { template: (row: unknown) => unknown } };
  };
  const cell = document.createElement("div");

  render(table.columns.icon.template(repository), cell);

  // Everything there is installed, a mark would say nothing
  expect(cell.querySelector(".installed-badge")).toBeNull();
});

it.each(["browse", "installed"] as const)(
  "marks the icon of what waits for an update on the %s tab",
  async (tab) => {
    const repository = {
      id: "1",
      name: "One",
      category: "plugin",
      installed: true,
      pending_upgrade: true,
    };
    const dashboard = await openDashboard([repository], tab);
    const table = dashboard.shadowRoot!.querySelector(
      "hass-tabs-subpage-data-table"
    ) as unknown as {
      columns: { icon: { template: (row: unknown) => unknown } };
    };
    const cell = document.createElement("div");

    render(table.columns.icon.template(repository), cell);

    // The update says more than that it is installed, so it takes its place
    expect(cell.querySelector(".installed-badge")).toBeNull();
    expect(
      cell.querySelector(".update-badge")!.getAttribute("aria-label")
    ).toBe("ui.panel.marketplace.repository_status.pending-upgrade");
  }
);

it("lists only what is installed on the installed tab", async () => {
  const installed = {
    id: "1",
    name: "One",
    category: "integration",
    installed: true,
  };
  const available = {
    id: "2",
    name: "Two",
    category: "integration",
    installed: false,
  };
  const dashboard = await openDashboard([installed, available], "installed");
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as { data: { id: string }[] };

  expect(table.data.map((repository) => repository.id)).toEqual(["1"]);
});

it.each([
  {
    name: "counts the updates",
    updates: 2,
    badge: "ui.panel.marketplace.tabs.updates",
  },
  { name: "shows nothing without updates", updates: 0, badge: undefined },
])("$name on the installed tab", async ({ updates, badge }) => {
  const repositories = Array.from({ length: 3 }, (_, index) => ({
    id: String(index),
    name: `Repository ${index}`,
    category: "integration",
    installed: true,
    pending_upgrade: index < updates,
  }));
  const dashboard = await openDashboard(repositories);
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as HTMLElement & { tabs: { badge?: string }[] };

  expect(table.tabs[2].badge).toBe(badge);
});

it("shows what to discover on the discover tab, not the table", async () => {
  const dashboard = await openDashboard([], "discover");

  expect(
    dashboard.shadowRoot!.querySelector("hass-tabs-subpage-data-table")
  ).toBeNull();
  expect(
    dashboard.shadowRoot!.querySelector(
      "hass-tabs-subpage ha-marketplace-discover"
    )
  ).not.toBeNull();
});

it("browses the way the link says", async () => {
  window.history.replaceState(
    null,
    "",
    "/marketplace/browse?sort=last_updated&direction=desc&status=new,installed&type=plugin"
  );
  const dashboard = await openDashboard();
  window.history.replaceState(null, "", "/");
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as HTMLElement & { initialSorting: unknown; filter: string };
  const [statusFilter, typeFilter] = dashboard.shadowRoot!.querySelectorAll(
    "ha-filter-states"
  ) as unknown as (HTMLElement & { value: string[] })[];

  expect(table.initialSorting).toEqual({
    column: "last_updated",
    direction: "desc",
  });
  // A search left behind would hide part of what the link promised
  expect(table.filter).toBe("");
  expect(statusFilter.value).toEqual(["new", "installed"]);
  expect(typeFilter.value).toEqual(["plugin"]);
});

it("browses the way the link says, also when the tab was open before", async () => {
  // The router keeps the page of a tab, and hangs it back in when it is opened
  const dashboard = await openDashboard();
  dashboard.remove();
  window.history.replaceState(
    null,
    "",
    "/marketplace/browse?sort=stars&direction=desc"
  );
  host.append(dashboard);
  await dashboard.updateComplete;
  const table = () =>
    dashboard.shadowRoot!.querySelector(
      "hass-tabs-subpage-data-table"
    ) as HTMLElement & { initialSorting: unknown };

  expect(table().initialSorting).toEqual({
    column: "stars",
    direction: "desc",
  });

  const before = table();
  window.history.replaceState(
    null,
    "",
    "/marketplace/browse?sort=last_updated&direction=asc"
  );
  window.dispatchEvent(new CustomEvent("location-changed"));
  await dashboard.updateComplete;
  window.history.replaceState(null, "", "/");

  // The table takes its sorting once, a new one takes the new sorting
  expect(table()).not.toBe(before);
  expect(table().initialSorting).toEqual({
    column: "last_updated",
    direction: "asc",
  });
});

const LINK = "/marketplace/browse?sort=stars&direction=desc&status=new";

it.each([
  {
    name: "following the link again applies it again",
    // Following a link makes a new history entry
    returnToLink: async () => window.history.pushState(null, "", LINK),
    statuses: ["new"],
  },
  {
    name: "going back keeps what was picked after it",
    returnToLink: async () => {
      const popped = new Promise((resolve) => {
        window.addEventListener("popstate", resolve, { once: true });
      });
      window.history.back();
      await popped;
    },
    statuses: ["installed"],
  },
])("$name", async ({ returnToLink, statuses }) => {
  window.history.pushState(null, "", LINK);
  const dashboard = await openDashboard();
  const statusFilter = () =>
    dashboard.shadowRoot!.querySelector("ha-filter-states") as unknown as {
      value: string[];
      dispatchEvent: (event: Event) => boolean;
    };
  statusFilter().dispatchEvent(
    new CustomEvent("data-table-filter-changed", {
      detail: { value: ["installed"] },
    })
  );
  await dashboard.updateComplete;

  // Away to another page and to the same link again, the router keeps the page
  dashboard.remove();
  window.history.pushState(null, "", "/marketplace/repository/1");
  await returnToLink();
  host.append(dashboard);
  await dashboard.updateComplete;
  window.history.replaceState(null, "", "/");

  expect(statusFilter().value).toEqual(statuses);
});

it("adds a repository from a link", async () => {
  const dashboard = await openDashboard();
  const fired = vi.fn();
  dashboard.addEventListener("show-dialog", (ev) =>
    fired((ev as CustomEvent).detail.dialogTag)
  );

  dashboard
    .shadowRoot!.querySelector(".add-from-link")!
    .dispatchEvent(new Event("click"));

  expect(fired).toHaveBeenCalledWith("dialog-marketplace-custom-repositories");
});

it("lists the custom repositories on their own page from the menu", async () => {
  const dashboard = await openDashboard();

  dashboard
    .shadowRoot!.querySelector(".toolbar-actions ha-dropdown")!
    .dispatchEvent(
      new CustomEvent("wa-select", {
        detail: { item: { value: "custom_repositories" } },
      })
    );

  await vi.waitFor(() =>
    expect(window.location.pathname).toBe("/marketplace/repositories")
  );
  window.history.replaceState(null, "", "/");
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
  const filtered = dashboard as unknown as {
    _filters: Record<string, string[]>;
  };
  filtered._filters = { status: ["installed"] };
  await dashboard.updateComplete;

  expect(
    dashboard.shadowRoot!.querySelector('ha-dropdown-item[value="dismiss_new"]')
  ).not.toBeNull();
  filtered._filters = {};
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

it("filters with the standard filter panes of Settings", async () => {
  const dashboard = await openDashboard();

  expect(
    [
      ...dashboard.shadowRoot!.querySelectorAll(
        'ha-filter-states[slot="filter-pane"]'
      ),
    ].map((filter) => (filter as HTMLElement & { label: string }).label)
  ).toEqual([
    "ui.panel.marketplace.filters.status",
    "ui.panel.marketplace.filters.type",
  ]);
  expect(dashboard.shadowRoot!.querySelector("ha-form")).toBeNull();
});

it.each([
  { name: "a brand icon", domain: "spook", tag: "img" },
  {
    name: "the category icon without a domain",
    domain: null,
    tag: "ha-svg-icon",
  },
])("shows $name for an integration", async ({ domain, tag }) => {
  const dashboard = await openDashboard();
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as {
    columns: { icon: { template: (row: unknown) => unknown } };
  };
  const cell = document.createElement("div");

  render(
    table.columns.icon.template({ category: "integration", domain }),
    cell
  );

  // The icon, inside what holds it and the mark of an install
  expect(cell.firstElementChild?.firstElementChild?.localName).toBe(tag);
});

it.each([
  { name: "an empty Marketplace", repositories: [], empty: true },
  {
    name: "a Marketplace with repositories",
    repositories: [
      { id: "1", name: "One", category: "theme", status: "default" },
    ],
    empty: false,
  },
])(
  "shows the empty state for $name: $empty",
  async ({ repositories, empty }) => {
    const dashboard = await openDashboard(repositories);
    const table = dashboard.shadowRoot!.querySelector(
      "hass-tabs-subpage-data-table"
    ) as HTMLElement & { empty: boolean };

    expect(table.empty).toBe(empty);
    expect(
      dashboard.shadowRoot!.querySelector('.empty[slot="empty"]') !== null
    ).toBe(empty);
  }
);

it("opens the row menu of a repository", async () => {
  const repository = { id: "1296269", name: "One", category: "integration" };
  const dashboard = await openDashboard([repository]);
  const table = dashboard.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as {
    columns: { actions: { template: (row: unknown) => unknown } };
  };
  const cell = document.createElement("div");
  dashboard.shadowRoot!.append(cell);
  render(table.columns.actions.template(repository), cell);

  cell.querySelector("ha-icon-button")!.dispatchEvent(new Event("click"));

  expect(
    (dashboard as unknown as { _overflowMenuRepository?: unknown })
      ._overflowMenuRepository
  ).toBe(repository);
});
