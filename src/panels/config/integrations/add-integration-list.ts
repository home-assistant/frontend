import type { IFuseOptions } from "fuse.js";
import type { HaListVirtualizedItem } from "../../../components/list/ha-list-virtualized";

export interface IntegrationListItem extends HaListVirtualizedItem {
  name: string;
  domain: string;
  config_flow?: boolean;
  is_helper?: boolean;
  integrations?: string[];
  domains?: string[];
  iot_standards?: string[];
  supported_by?: string;
  cloud?: boolean;
  is_built_in?: boolean;
  overwrites_built_in?: boolean;
  is_add?: boolean;
  single_config_entry?: boolean;
  // A brand title row, not pickable
  is_header?: boolean;
  is_end_space?: boolean;
  result?: "brand" | "category" | "more";
  category?: string;
  subcategory?: string;
  section?: SearchSection;
  icon?: string;
  description?: string;
  categories?: string[];
}

export type BrowseBy = "category" | "brand";

export type Connection = "local" | "cloud";

export const CONNECTIONS: Connection[] = ["local", "cloud"];

export const ofConnection = (
  item: IntegrationListItem,
  connection?: Connection
) => !connection || (connection === "cloud") === !!item.cloud;

export type SearchSection = "brand" | "category" | "integration" | "helper";

export const SEARCH_SECTIONS: SearchSection[] = [
  "brand",
  "category",
  "integration",
  "helper",
];

export const MAX_SEARCH_ITEMS_PER_SECTION = 5;

export const searchOptions = (
  filter: string
): IFuseOptions<IntegrationListItem> => ({
  keys: [
    { name: "name", weight: 5 },
    { name: "domain", weight: 5 },
    { name: "integrations", weight: 2 },
    "supported_by",
    "iot_standards",
  ],
  isCaseSensitive: false,
  minMatchCharLength: Math.min(filter.length, 2),
  threshold: 0.2,
  ignoreDiacritics: true,
});

export interface IntegrationCategory {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
}

export const inCategory = (
  categories: string[] | undefined,
  category?: string,
  subcategory?: string
) =>
  !category ||
  (categories || []).some((slug) =>
    subcategory
      ? slug === `${category}.${subcategory}`
      : slug === category || slug.startsWith(`${category}.`)
  );
