import type { HassEntities } from "home-assistant-js-websocket";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { dataTableQueryParamConfig } from "../../../common/url/data-table-query-params";
import {
  createMarketplaceFilterQueryString,
  decodeMarketplaceFilterQueryParams,
  marketplaceFilterQueryParamConfig,
} from "../../../common/url/marketplace-query-params";
import {
  createQueryString,
  decodeQueryParams,
  hasQueryParams,
  type SearchParamsSource,
} from "../../../common/url/query-params";
import type { DataTableRowData } from "../../../components/data-table/ha-data-table";
import type { RepositoryBase } from "../../../data/marketplace/repository";
import type { HomeAssistant } from "../../../types";
import type { MarketplaceTab } from "./ha-marketplace-dashboard";

export const STATUS_ORDER = [
  "pending-restart",
  "pending-upgrade",
  "installed",
  "new",
  "default",
] as const satisfies readonly RepositoryBase["status"][];

// New and available are never installed, so the installed tab only has these
const INSTALLED_STATUS_ORDER = [
  "pending-restart",
  "pending-upgrade",
  "installed",
] as const satisfies readonly RepositoryBase["status"][];

export const STATUS_FILTER = "status";
export const TYPE_FILTER = "type";

export const SOURCE_FILTER = "source";

// Where a repository comes from, the community catalog or added from a link
export const SOURCE_ORDER = ["catalog", "custom"] as const;

type RepositorySource = (typeof SOURCE_ORDER)[number];

const repositorySource = (repository: RepositoryBase): RepositorySource =>
  repository.custom ? "custom" : "catalog";

// What the filter panes picked, nothing picked in a pane shows everything
export type RepositoryFilters = Partial<
  Record<
    typeof STATUS_FILTER | typeof TYPE_FILTER | typeof SOURCE_FILTER,
    string[]
  >
>;

export interface MarketplaceRepository extends RepositoryBase {
  update_skipped?: boolean;
}

export const marketplaceUpdateEntityIds = (
  entities: HomeAssistant["entities"]
): string[] =>
  Object.values(entities)
    .filter(
      (entity) =>
        entity.platform === "marketplace" &&
        computeDomain(entity.entity_id) === "update" &&
        entity.device_id
    )
    .map((entity) => entity.entity_id);

// The skip is kept on the update entity, its device names the repository
export const skippedUpdateRepositories = (
  entityIds: string[],
  entities: HomeAssistant["entities"],
  devices: HomeAssistant["devices"],
  states: HassEntities
): string[] =>
  entityIds
    .flatMap((entityId) => {
      const entity = entities[entityId];
      const attributes = states[entityId]?.attributes;

      if (
        !entity?.device_id ||
        !attributes?.latest_version ||
        attributes.skipped_version !== attributes.latest_version
      ) {
        return [];
      }

      const repositoryId = devices[entity.device_id]?.identifiers.find(
        ([domain]) => domain === "marketplace"
      )?.[1];

      return repositoryId ? [repositoryId] : [];
    })
    .sort();

// A skipped update leaves the repository installed. A restart it waits for
// is still needed, so that status stays.
export const applySkippedUpdates = (
  repositories: RepositoryBase[],
  skipped: string[]
): MarketplaceRepository[] =>
  skipped.length
    ? repositories.map((repository): MarketplaceRepository => {
        if (!repository.pending_upgrade || !skipped.includes(repository.id)) {
          return repository;
        }

        return {
          ...repository,
          update_skipped: true,
          pending_upgrade: false,
          status:
            repository.status === "pending-upgrade"
              ? "installed"
              : repository.status,
        };
      })
    : repositories;

export const statusesOfTab = (
  tab: MarketplaceTab
): readonly (typeof STATUS_ORDER)[number][] =>
  tab === "installed" ? INSTALLED_STATUS_ORDER : STATUS_ORDER;

// The filters are kept for every tab. A status picked on another tab that this
// one can't list is left out here, instead of leaving the table empty.
export const filtersOfTab = (
  filters: RepositoryFilters,
  tab: MarketplaceTab
): RepositoryFilters => {
  const statuses: readonly string[] = statusesOfTab(tab);

  return {
    ...filters,
    [STATUS_FILTER]: filters[STATUS_FILTER]?.filter((status) =>
      statuses.includes(status)
    ),
  };
};

// The status pane only sends what this tab lists, so statuses picked on another
// tab that this one can't list are kept for when that tab is opened again
export const statusFilterOfTab = (
  filters: RepositoryFilters,
  tab: MarketplaceTab,
  picked: string[] = []
): string[] => {
  const statuses: readonly string[] = statusesOfTab(tab);

  return [
    ...(filters[STATUS_FILTER]?.filter(
      (status) => !statuses.includes(status)
    ) ?? []),
    ...picked,
  ];
};

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

  const sources = filters[SOURCE_FILTER];

  if (sources?.length && !sources.includes(repositorySource(repository))) {
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
      translated_source: localize(
        `ui.panel.marketplace.repository_source.${repositorySource(repository)}`
      ),
      // A date as text or 0 without one, only numbers sort among each other
      last_updated_timestamp: timestamp(repository.last_updated),
    }));

// How to browse, the way a link says it, like
// /marketplace/browse?status=new&search=card&sort=stars&direction=desc
export interface BrowseSettings {
  search?: string;
  // The column by its name in the URL, the one its `urlName` gives
  sorting?: { column: string; direction: "asc" | "desc" };
  filters: RepositoryFilters;
}

export const browseUrl = ({
  search,
  sorting,
  filters,
}: BrowseSettings): string => {
  const query = [
    createMarketplaceFilterQueryString(filters),
    createQueryString(
      {
        search,
        sort: sorting?.column,
        // Ascending is what a sort without a direction does
        direction: sorting?.direction === "desc" ? "desc" : undefined,
      },
      dataTableQueryParamConfig
    ),
  ]
    .filter(Boolean)
    .join("&");
  return query ? `/marketplace/browse?${query}` : "/marketplace/browse";
};

// What a link says to show, undefined when it says nothing about browsing so
// what was picked before stays. A link replaces the search and the filters,
// ones left behind would hide part of what it shows. The table applies its
// sorting and grouping.
export interface BrowseLink {
  search: string;
  filters: RepositoryFilters;
}

export const browseLinkFromUrl = (
  searchParams: SearchParamsSource
): BrowseLink | undefined => {
  if (
    !hasQueryParams(searchParams, marketplaceFilterQueryParamConfig) &&
    !hasQueryParams(searchParams, dataTableQueryParamConfig)
  ) {
    return undefined;
  }

  const lists = decodeMarketplaceFilterQueryParams(searchParams);
  const { search } = decodeQueryParams(searchParams, dataTableQueryParamConfig);

  return {
    search: search ?? "",
    filters: {
      [STATUS_FILTER]: lists.status?.filter(Boolean),
      [TYPE_FILTER]: lists.type?.filter(Boolean),
      [SOURCE_FILTER]: lists.source?.filter(Boolean),
    },
  };
};
