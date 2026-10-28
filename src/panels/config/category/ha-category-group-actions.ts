import type { ContextType } from "@lit/context";
import { mdiDelete, mdiDotsVertical, mdiPencil } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import type { CategoryRegistryEntry } from "../../../data/category_registry";
import {
  deleteCategoryRegistryEntry,
  updateCategoryRegistryEntry,
} from "../../../data/category_registry";
import { apiContext } from "../../../data/context";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

@customElement("ha-category-group-actions")
export class HaCategoryGroupActions extends LitElement {
  @property({ attribute: false }) public category?: CategoryRegistryEntry;

  @property() public scope?: string;

  @property({ attribute: false }) public onDeleted?: (
    categoryId: string
  ) => void;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected render() {
    if (!this.category) {
      return nothing;
    }
    return html`<ha-dropdown @wa-select=${this._handleAction}>
      <ha-icon-button
        slot="trigger"
        .label=${this._localize("ui.common.overflow_menu_for", {
          name: this.category.name,
        })}
        .path=${mdiDotsVertical}
      ></ha-icon-button>
      <ha-dropdown-item value="edit">
        <ha-svg-icon slot="icon" .path=${mdiPencil}></ha-svg-icon>
        ${this._localize("ui.panel.config.category.editor.edit")}
      </ha-dropdown-item>
      <ha-dropdown-item value="delete" variant="danger">
        <ha-svg-icon slot="icon" .path=${mdiDelete}></ha-svg-icon>
        ${this._localize("ui.panel.config.category.editor.delete")}
      </ha-dropdown-item>
    </ha-dropdown>`;
  }

  private _handleAction(ev: HaDropdownSelectEvent<"edit" | "delete">) {
    if (ev.detail.item.value === "delete") {
      this._deleteCategory();
      return;
    }
    const category = this.category!;
    const scope = this.scope!;
    showCategoryRegistryDetailDialog(this, {
      scope,
      entry: category,
      updateEntry: (updates) =>
        updateCategoryRegistryEntry(
          this._api.callWS,
          scope,
          category.category_id,
          updates
        ),
    });
  }

  private async _deleteCategory() {
    const category = this.category!;
    const scope = this.scope!;
    const confirmed = await showConfirmationDialog(this, {
      title: this._localize("ui.panel.config.category.editor.confirm_delete"),
      text: this._localize(
        "ui.panel.config.category.editor.confirm_delete_text"
      ),
      confirmText: this._localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteCategoryRegistryEntry(
        this._api.callWS,
        scope,
        category.category_id
      );
      this.onDeleted?.(category.category_id);
    } catch (err: any) {
      showAlertDialog(this, { text: err.message });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-category-group-actions": HaCategoryGroupActions;
  }
}
