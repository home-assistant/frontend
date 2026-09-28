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

const matchesFilters = (
  repository: RepositoryBase,
  activeFilters: string[] | undefined
): boolean => {
  if (
    activeFilters?.some((filter) => filter.startsWith("status_")) &&
    !activeFilters.includes(`status_${repository.status}`)
  ) {
    return false;
  }

  if (
    activeFilters?.some((filter) => filter.startsWith("type_")) &&
    !activeFilters.includes(`type_${repository.category}`)
  ) {
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
  activeFilters?: string[]
): DataTableRowData[] =>
  repositories
    .filter((repository) => matchesFilters(repository, activeFilters))
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
