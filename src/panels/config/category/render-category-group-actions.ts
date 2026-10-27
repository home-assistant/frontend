import { mdiDelete, mdiDotsVertical, mdiPencil } from "@mdi/js";
import { html, nothing } from "lit";
import { repeat } from "lit/directives/repeat";
import { groupActionsSlot } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-dropdown";
import type {
  HaDropdown,
  HaDropdownSelectEvent,
} from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import {
  deleteCategoryRegistryEntry,
  updateCategoryRegistryEntry,
} from "../../../data/category_registry";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

type CategoryMenu = HaDropdown & {
  category: CategoryRegistryEntry;
  scope: string;
  hass: HomeAssistant;
  onDeleted: (categoryId: string) => void;
};

const deleteCategory = async (menu: CategoryMenu) => {
  const { category, scope, hass, onDeleted } = menu;
  const confirmed = await showConfirmationDialog(menu, {
    title: hass.localize("ui.panel.config.category.editor.confirm_delete"),
    text: hass.localize("ui.panel.config.category.editor.confirm_delete_text"),
    confirmText: hass.localize("ui.common.delete"),
    destructive: true,
  });
  if (!confirmed) {
    return;
  }
  try {
    await deleteCategoryRegistryEntry(hass.callWS, scope, category.category_id);
    onDeleted(category.category_id);
  } catch (err: any) {
    showAlertDialog(menu, { text: err.message });
  }
};

const handleAction = (ev: HaDropdownSelectEvent<"edit" | "delete">) => {
  const menu = ev.currentTarget as CategoryMenu;
  if (ev.detail.item.value === "delete") {
    deleteCategory(menu);
    return;
  }
  const { category, scope, hass } = menu;
  showCategoryRegistryDetailDialog(menu, {
    scope,
    entry: category,
    updateEntry: (updates) =>
      updateCategoryRegistryEntry(
        hass.callWS,
        scope,
        category.category_id,
        updates
      ),
  });
};

// The same edit and delete menu as the categories filter, on the category
// group headers of a table grouped by category, which names its groups after
// the categories. Other groupings can have groups with the same names.
// onDeleted lets the page take a deleted category out of its filter.
export const renderCategoryGroupActions = (
  hass: HomeAssistant,
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
          html`<ha-dropdown
            slot=${groupActionsSlot(category.name)}
            .category=${category}
            .scope=${scope}
            .hass=${hass}
            .onDeleted=${onDeleted}
            @wa-select=${handleAction}
          >
            <ha-icon-button
              slot="trigger"
              .label=${hass.localize("ui.common.overflow_menu_for", {
                name: category.name,
              })}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-dropdown-item value="edit">
              <ha-svg-icon slot="icon" .path=${mdiPencil}></ha-svg-icon>
              ${hass.localize("ui.panel.config.category.editor.edit")}
            </ha-dropdown-item>
            <ha-dropdown-item value="delete" variant="danger">
              <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
              ${hass.localize("ui.panel.config.category.editor.delete")}
            </ha-dropdown-item>
          </ha-dropdown>`
      )
    : nothing;
