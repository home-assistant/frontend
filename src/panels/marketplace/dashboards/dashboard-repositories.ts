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

export const STATUS_FILTER = "status";
export const TYPE_FILTER = "type";
const SORT_PARAM = "sort";
const DIRECTION_PARAM = "direction";

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

// The moment as a number, 0 without one, or for a date that can not be read
export const timestamp = (value: string | number): number =>
  value ? new Date(value).getTime() || 0 : 0;

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
      // A date as text or 0 without one, only numbers sort among each other
      last_updated_timestamp: timestamp(repository.last_updated),
    }));

// How to browse, the way a link says it, like
// /marketplace/browse?sort=stars&direction=desc&status=new
export interface BrowseSettings {
  sorting?: { column: string; direction: "asc" | "desc" };
  filters: RepositoryFilters;
}

export const browseUrl = ({ sorting, filters }: BrowseSettings): string => {
  const params = new URLSearchParams();
  if (sorting) {
    params.set(SORT_PARAM, sorting.column);
    params.set(DIRECTION_PARAM, sorting.direction);
  }
  for (const filter of [STATUS_FILTER, TYPE_FILTER] as const) {
    if (filters[filter]?.length) {
      params.set(filter, filters[filter].join(","));
    }
  }

  const query = params.toString();
  return query ? `/marketplace/browse?${query}` : "/marketplace/browse";
};

// Nothing about browsing in the link keeps what was picked before
export const browseSettingsFromUrl = (
  search: string
): BrowseSettings | undefined => {
  const params = new URLSearchParams(search);
  if (
    ![SORT_PARAM, STATUS_FILTER, TYPE_FILTER].some((key) => params.has(key))
  ) {
    return undefined;
  }

  const column = params.get(SORT_PARAM);
  const values = (key: string) => params.get(key)?.split(",").filter(Boolean);
  return {
    sorting: column
      ? {
          column,
          direction: params.get(DIRECTION_PARAM) === "asc" ? "asc" : "desc",
        }
      : undefined,
    filters: {
      [STATUS_FILTER]: values(STATUS_FILTER),
      [TYPE_FILTER]: values(TYPE_FILTER),
    },
  };
};
