import { mdiPencil } from "@mdi/js";
import { html } from "lit";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { groupActionsSlot } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-icon-button";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import { updateCategoryRegistryEntry } from "../../../data/category_registry";
import type { HomeAssistant } from "../../../types";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

type CategoryEditButton = HTMLElement & {
  category: CategoryRegistryEntry;
  scope: string;
  hass: HomeAssistant;
};

const editCategory = (ev: HASSDomCurrentTargetEvent<CategoryEditButton>) => {
  const { category, scope, hass } = ev.currentTarget;
  showCategoryRegistryDetailDialog(ev.currentTarget, {
    scope,
    entry: category,
    updateEntry: (updates) =>
      updateCategoryRegistryEntry(hass, scope, category.category_id, updates),
  });
};

// Edit buttons for the category group headers of a table grouped by category,
// which names its groups after the categories
export const renderCategoryGroupActions = (
  hass: HomeAssistant,
  scope: string,
  categories: CategoryRegistryEntry[] | undefined
) =>
  categories?.map(
    (category) =>
      html`<ha-icon-button
        slot=${groupActionsSlot(category.name)}
        .label=${hass.localize("ui.panel.config.category.editor.edit")}
        .path=${mdiPencil}
        .category=${category}
        .scope=${scope}
        .hass=${hass}
        @click=${editCategory}
      ></ha-icon-button>`
  );
