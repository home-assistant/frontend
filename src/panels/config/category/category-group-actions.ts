import { html, nothing } from "lit";
import type { DataTableGroupActions } from "../../../components/data-table/ha-data-table";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import "./ha-category-group-actions";

// The same edit and delete menu as the categories filter, on the category
// group headers of a table grouped by category, which names its groups after
// the categories. Other groupings can have groups with the same names.
// onDeleted lets the page take a deleted category out of its filter.
export const categoryGroupActions = (
  scope: string,
  categories: CategoryRegistryEntry[] | undefined,
  grouping: string | undefined,
  onDeleted: (categoryId: string) => void
): DataTableGroupActions | undefined =>
  grouping === "category"
    ? (group) => {
        const category = categories?.find((cat) => cat.name === group);
        return category
          ? html`<ha-category-group-actions
              .category=${category}
              .scope=${scope}
              .onDeleted=${onDeleted}
            ></ha-category-group-actions>`
          : nothing;
      }
    : undefined;
