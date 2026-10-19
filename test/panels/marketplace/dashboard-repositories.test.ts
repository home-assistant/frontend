import { describe, expect, it } from "vitest";
import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { DataTableRowData } from "../../../src/components/data-table/ha-data-table";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import type { HomeAssistant } from "../../../src/types";
import {
  applySkippedUpdates,
  browseLinkFromUrl,
  browseUrl,
  filterRepositories,
  filtersOfTab,
  marketplaceUpdateEntityIds,
  skippedUpdateRepositories,
  statusesOfTab,
  statusFilterOfTab,
} from "../../../src/panels/marketplace/dashboards/dashboard-repositories";
import {
  mockDevice,
  mockEntity,
  mockStateObj,
} from "../../common/entity/context/context-mock";

const localize = ((key: string) => key) as LocalizeFunc;

const repository = (
  name: string,
  extra: Partial<RepositoryBase> = {}
): RepositoryBase =>
  ({
    id: name,
    name,
    category: "integration",
    status: "default",
    installed: false,
    new: false,
    stars: 0,
    ...extra,
  }) as RepositoryBase;

const names = (rows: DataTableRowData[]) => rows.map((row) => row.name);

describe("filterRepositories", () => {
  const repositories = [
    repository("Plain"),
    repository("Theme", { category: "theme" }),
    repository("Downloaded", { status: "installed", installed: true }),
    repository("Fresh", { status: "new", new: true }),
    repository("Outdated", { status: "pending-upgrade", installed: true }),
  ];

  it("shows everything without filters", () => {
    expect(names(filterRepositories(repositories, localize))).toHaveLength(5);
    expect(names(filterRepositories(repositories, localize, {}))).toHaveLength(
      5
    );
  });

  it.each([
    // Installed is everything installed, also what has an update waiting
    [{ status: ["installed"] }, ["Downloaded", "Outdated"]],
    [{ status: ["pending-upgrade"] }, ["Outdated"]],
    [{ status: ["installed", "new"] }, ["Downloaded", "Outdated", "Fresh"]],
    [{ type: ["theme"] }, ["Theme"]],
    [{ status: ["default"], type: ["theme"] }, ["Theme"]],
    [{ status: ["new"], type: ["theme"] }, []],
    [
      { status: [], type: [] },
      ["Downloaded", "Outdated", "Fresh", "Plain", "Theme"],
    ],
  ])("keeps what matches %j", (activeFilters, expected) => {
    expect(
      names(filterRepositories(repositories, localize, activeFilters))
    ).toEqual(expected);
  });

  it.each([
    [{ source: ["custom"] }, ["Linked"]],
    [{ source: ["catalog"] }, ["Plain"]],
    [{ source: ["catalog", "custom"] }, ["Linked", "Plain"]],
    [{ source: ["custom"], type: ["theme"] }, []],
  ])("keeps the source that matches %j", (activeFilters, expected) => {
    expect(
      names(
        filterRepositories(
          [repository("Plain"), repository("Linked", { custom: true })],
          localize,
          activeFilters
        )
      )
    ).toEqual(expected);
  });

  it("puts installed first, then new, then the most starred, then by name", () => {
    const sorted = filterRepositories(
      [
        repository("Beta", { stars: 5 }),
        repository("Alpha", { stars: 5 }),
        repository("Starred", { stars: 100 }),
        repository("Fresh", { new: true }),
        repository("Downloaded", { installed: true }),
      ],
      localize
    );

    expect(names(sorted)).toEqual([
      "Downloaded",
      "Fresh",
      "Starred",
      "Alpha",
      "Beta",
    ]);
  });

  it("adds when it was last updated as a number to sort on", () => {
    const rows = filterRepositories(
      [
        repository("Dated", { last_updated: "2026-09-30T12:00:00Z" }),
        repository("Undated", { last_updated: 0 }),
      ],
      localize
    );

    expect(rows.map((row) => row.last_updated_timestamp)).toEqual([
      Date.parse("2026-09-30T12:00:00Z"),
      0,
    ]);
  });

  it("adds the translated status, category and source to group by", () => {
    const [row] = filterRepositories(
      [
        repository("Downloaded", {
          status: "installed",
          category: "theme",
          custom: true,
        }),
      ],
      localize
    );

    expect(row.translated_status).toBe(
      "ui.panel.marketplace.repository_status.installed"
    );
    expect(row.translated_category).toBe(
      "ui.panel.marketplace.common.type.theme"
    );
    expect(row.translated_source).toBe(
      "ui.panel.marketplace.repository_source.custom"
    );
  });

  it("falls back to the raw status without a translation", () => {
    const [row] = filterRepositories(
      [repository("Downloaded", { status: "installed" })],
      (() => "") as unknown as LocalizeFunc
    );

    expect(row.translated_status).toBe("installed");
  });

  it("leaves the list it was handed alone", () => {
    const unsorted = [repository("Beta"), repository("Alpha")];

    filterRepositories(unsorted, localize);

    expect(names(unsorted)).toEqual(["Beta", "Alpha"]);
  });
});

describe("browseUrl", () => {
  it("links to what browseLinkFromUrl and the table read back", () => {
    const url = new URL(
      browseUrl({
        search: "mushroom card",
        sorting: { column: "stars", direction: "desc" },
        filters: { status: ["new"], type: ["theme"], source: ["custom"] },
      }),
      "http://localhost"
    );

    expect(url.pathname).toBe("/marketplace/browse");
    expect(url.searchParams.get("sort")).toBe("stars");
    expect(url.searchParams.get("direction")).toBe("desc");
    expect(browseLinkFromUrl(url.search)).toEqual({
      search: "mushroom card",
      filters: { status: ["new"], type: ["theme"], source: ["custom"] },
    });
  });

  it("leaves the direction out when sorting ascending", () => {
    expect(
      browseUrl({ sorting: { column: "name", direction: "asc" }, filters: {} })
    ).toBe("/marketplace/browse?sort=name");
  });
});

describe("browseLinkFromUrl", () => {
  it("replaces the search and filters for a link that only sorts", () => {
    expect(browseLinkFromUrl("?sort=stars&direction=desc")).toEqual({
      search: "",
      filters: { status: undefined, type: undefined, source: undefined },
    });
  });

  it("keeps what was picked for a link that says nothing about browsing", () => {
    expect(
      browseLinkFromUrl("?owner=hacs&repository=integration")
    ).toBeUndefined();
  });
});

describe("filtersOfTab", () => {
  it("only offers statuses something installed can have on the installed tab", () => {
    expect(statusesOfTab("installed")).toEqual([
      "pending-restart",
      "pending-upgrade",
      "installed",
    ]);
    expect(statusesOfTab("browse")).toContain("new");
  });

  it("leaves out a status picked on browse that the installed tab can't list", () => {
    const filters = { status: ["new", "installed"], type: ["theme"] };

    expect(filtersOfTab(filters, "installed")).toEqual({
      status: ["installed"],
      type: ["theme"],
    });
    expect(filtersOfTab(filters, "browse")).toEqual(filters);
    // Kept as picked, for when browse is opened again
    expect(filters.status).toEqual(["new", "installed"]);
  });

  it("keeps a status picked on browse when the installed status pane changes", () => {
    const filters = { status: ["new", "installed"] };

    expect(
      statusFilterOfTab(filters, "installed", ["pending-upgrade"])
    ).toEqual(["new", "pending-upgrade"]);
    expect(statusFilterOfTab(filters, "installed", [])).toEqual(["new"]);
    // The pane's clear button sends no value
    expect(statusFilterOfTab(filters, "installed", undefined)).toEqual(["new"]);
    expect(statusFilterOfTab(filters, "browse", ["default"])).toEqual([
      "default",
    ]);
  });
});

describe("skippedUpdateRepositories", () => {
  const entities: HomeAssistant["entities"] = {
    "update.mushroom": mockEntity({
      entity_id: "update.mushroom",
      platform: "marketplace",
      device_id: "mushroom_device",
    }),
    "update.older": mockEntity({
      entity_id: "update.older",
      platform: "marketplace",
      device_id: "older_device",
    }),
    "update.other": mockEntity({
      entity_id: "update.other",
      platform: "esphome",
      device_id: "other_device",
    }),
  };

  const devices: HomeAssistant["devices"] = {
    mushroom_device: mockDevice({
      id: "mushroom_device",
      identifiers: [["marketplace", "444350375"]],
    }),
    older_device: mockDevice({
      id: "older_device",
      identifiers: [["marketplace", "1"]],
    }),
    other_device: mockDevice({
      id: "other_device",
      identifiers: [["esphome", "2"]],
    }),
  };

  const update = (
    entityId: string,
    latest: string,
    skipped: string | null
  ): HassEntity =>
    mockStateObj({
      entity_id: entityId,
      state: "off",
      attributes: { latest_version: latest, skipped_version: skipped },
    });

  it("finds the repositories of Marketplace update entities whose latest version is skipped", () => {
    const states: HassEntities = {
      "update.mushroom": update("update.mushroom", "v5.0.0", "v5.0.0"),
      // A newer release than the one skipped is an update again
      "update.older": update("update.older", "v2.0.0", "v1.0.0"),
      "update.other": update("update.other", "2026.10.0", "2026.10.0"),
    };

    const updateEntityIds = marketplaceUpdateEntityIds(entities);

    expect(updateEntityIds).toEqual(["update.mushroom", "update.older"]);
    expect(
      skippedUpdateRepositories(updateEntityIds, entities, devices, states)
    ).toEqual(["444350375"]);
  });
});

describe("applySkippedUpdates", () => {
  const repositories = [
    repository("Skipped", {
      status: "pending-upgrade",
      installed: true,
      pending_upgrade: true,
    }),
    repository("Restart", {
      status: "pending-restart",
      installed: true,
      pending_upgrade: true,
    }),
    repository("Outdated", {
      status: "pending-upgrade",
      installed: true,
      pending_upgrade: true,
    }),
  ];

  it("shows a skipped update as installed", () => {
    const [skipped, restart, outdated] = applySkippedUpdates(repositories, [
      "Skipped",
      "Restart",
    ]);

    expect(skipped).toMatchObject({
      status: "installed",
      pending_upgrade: false,
      update_skipped: true,
    });
    // It still needs the restart
    expect(restart).toMatchObject({
      status: "pending-restart",
      pending_upgrade: false,
    });
    expect(outdated).toBe(repositories[2]);
  });
});
