import type { LocalizeFunc } from "../../../common/translations/localize";
import type { DataTableRowData } from "../../../components/data-table/ha-data-table";
import type { RepositoryBase } from "../../../data/marketplace/repository";

export const STATUS_ORDER = [
  "pending-restart",
  "pending-upgrade",
  "installed",
  "new",
  "default",
] as const satisfies readonly RepositoryBase["status"][];

export const DEFAULT_GROUP_COLUMN = "translated_status";

export const STATUS_FILTER = "status";
export const TYPE_FILTER = "type";

// What the filter panes picked, nothing picked in a pane shows everything
export type RepositoryFilters = Partial<
  Record<typeof STATUS_FILTER | typeof TYPE_FILTER, string[]>
>;

const matchesFilters = (
  repository: RepositoryBase,
  filters: RepositoryFilters = {}
): boolean => {
  const statuses = filters[STATUS_FILTER];
  // Installed takes in what waits for an update or a restart, it is installed too
  if (
    statuses?.length &&
    !statuses.includes(repository.status) &&
    !(statuses.includes("installed") && repository.installed)
  ) {
    return false;
  }

  const types = filters[TYPE_FILTER];
  if (types?.length && !types.includes(repository.category)) {
    return false;
  }

  return true;
};

// Downloaded first, then new ones, then the most starred.
const compareRepositories = (a: RepositoryBase, b: RepositoryBase): number => {
  if (a.installed !== b.installed) {
    return a.installed ? -1 : 1;
  }
  if (a.new !== b.new) {
    return a.new ? -1 : 1;
  }
  if (a.stars !== b.stars) {
    return a.stars > b.stars ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
};

export const filterRepositories = (
  repositories: RepositoryBase[],
  localize: LocalizeFunc,
  filters?: RepositoryFilters
): DataTableRowData[] =>
  repositories
    .filter((repository) => matchesFilters(repository, filters))
    .sort(compareRepositories)
    .map((repository) => ({
      ...repository,
      translated_status:
        localize(
          `ui.panel.marketplace.repository_status.${repository.status}`
        ) || repository.status,
      translated_category: localize(
        `ui.panel.marketplace.common.type.${repository.category}`
      ),
    }));

// Status groups follow the order of a repository's life, not the alphabet.
export const repositoryGroupOrder = (
  localize: LocalizeFunc,
  groupColumn: string
): string[] | undefined =>
  groupColumn === "translated_status"
    ? STATUS_ORDER.map((status) =>
        localize(`ui.panel.marketplace.repository_status.${status}`)
      )
    : undefined;
