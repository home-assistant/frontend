import { describe, expect, it } from "vitest";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { DataTableRowData } from "../../../src/components/data-table/ha-data-table";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import {
  DEFAULT_GROUP_COLUMN,
  filterRepositories,
  repositoryGroupOrder,
} from "../../../src/panels/marketplace/dashboards/dashboard-repositories";

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
  ];

  it("shows everything without filters", () => {
    expect(names(filterRepositories(repositories, localize))).toHaveLength(4);
    expect(names(filterRepositories(repositories, localize, {}))).toHaveLength(
      4
    );
  });

  it.each([
    [{ status: ["installed"] }, ["Downloaded"]],
    [{ status: ["installed", "new"] }, ["Downloaded", "Fresh"]],
    [{ type: ["theme"] }, ["Theme"]],
    [{ status: ["default"], type: ["theme"] }, ["Theme"]],
    [{ status: ["new"], type: ["theme"] }, []],
    [{ status: [], type: [] }, ["Downloaded", "Fresh", "Plain", "Theme"]],
  ])("keeps what matches %j", (activeFilters, expected) => {
    expect(
      names(filterRepositories(repositories, localize, activeFilters))
    ).toEqual(expected);
  });

  it("puts downloaded first, then new, then the most starred, then by name", () => {
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

  it("adds the translated status and category to group by", () => {
    const [row] = filterRepositories(
      [repository("Downloaded", { status: "installed", category: "theme" })],
      localize
    );

    expect(row.translated_status).toBe(
      "ui.panel.marketplace.repository_status.installed"
    );
    expect(row.translated_category).toBe(
      "ui.panel.marketplace.common.type.theme"
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

describe("repositoryGroupOrder", () => {
  it("orders the status groups by where a repository is in its life", () => {
    expect(repositoryGroupOrder(localize, DEFAULT_GROUP_COLUMN)).toEqual([
      "ui.panel.marketplace.repository_status.pending-restart",
      "ui.panel.marketplace.repository_status.pending-upgrade",
      "ui.panel.marketplace.repository_status.installed",
      "ui.panel.marketplace.repository_status.new",
      "ui.panel.marketplace.repository_status.default",
    ]);
  });

  it("leaves the order of other groups to the table", () => {
    expect(
      repositoryGroupOrder(localize, "translated_category")
    ).toBeUndefined();
  });
});
