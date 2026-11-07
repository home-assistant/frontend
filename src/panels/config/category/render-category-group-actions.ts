import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat";
import { groupActionsSlot } from "../../../components/data-table/ha-data-table";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import "./ha-category-group-actions";

// The same edit and delete menu as the categories filter, on the category
// group headers of a table grouped by category, which names its groups after
// the categories. Other groupings can have groups with the same names.
// onDeleted lets the page take a deleted category out of its filter.
export const renderCategoryGroupActions = (
  scope: string,
  categories: CategoryRegistryEntry[] | undefined,
  grouping: string | undefined,
  onDeleted: (categoryId: string) => void
) =>
  grouping === "category"
    ? repeat(
        categories ?? [],
        (category) => category.category_id,
        (category) =>
          html`<ha-category-group-actions
            slot=${groupActionsSlot(category.name)}
            .category=${category}
            .scope=${scope}
            .onDeleted=${onDeleted}
          ></ha-category-group-actions>`
      )
    : nothing;
