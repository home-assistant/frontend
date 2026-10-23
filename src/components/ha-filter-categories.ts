import {
  mdiDelete,
  mdiDotsVertical,
  mdiFilterVariantRemove,
  mdiPencil,
  mdiPlus,
  mdiTag,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { createRef, ref } from "lit/directives/ref";
import { repeat } from "lit/directives/repeat";
import {
  FilterPanelController,
  filterPanelStyles,
} from "../common/controllers/filter-panel-controller";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import type { CategoryRegistryEntry } from "../data/category_registry";
import {
  createCategoryRegistryEntry,
  deleteCategoryRegistryEntry,
  subscribeCategoryRegistry,
  updateCategoryRegistryEntry,
} from "../data/category_registry";
import { showConfirmationDialog } from "../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { showCategoryRegistryDetailDialog } from "../panels/config/category/show-dialog-category-registry-detail";
import { haStyleScrollbar } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-dropdown";
import type { HaDropdownSelectEvent } from "./ha-dropdown";
import "./ha-dropdown-item";
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-list-item";
import "./item/ha-list-item-option";
import "./list/ha-list-selectable";

@customElement("ha-filter-categories")
export class HaFilterCategories extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public scope?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _categories: CategoryRegistryEntry[] = [];

  private _content = createRef<HTMLElement>();

  private _panel = new FilterPanelController(this, this._content);

  protected hassSubscribeRequiredHostProps = ["scope"];

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeCategoryRegistry(
        this.hass.connection,
        this.scope!,
        (categories) => {
          this._categories = categories;
        }
      ),
    ];
  }

  protected render() {
    return html`
      <ha-expansion-panel
        left-chevron
        .expanded=${this.expanded}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.category.caption")}
          ${
            this.value?.length
              ? html`<div class="badge">${this.value?.length}</div>
                  <ha-icon-button
                    .path=${mdiFilterVariantRemove}
                    @click=${this._clearFilter}
                  ></ha-icon-button>`
              : nothing
          }
        </div>
      </ha-expansion-panel>
      ${
        this._panel.showContent
          ? html`
              <div class="content" ${ref(this._content)}>
                <ha-list-selectable
                  class="ha-scrollbar"
                  multi
                  aria-label=${this.hass.localize(
                    "ui.panel.config.category.caption"
                  )}
                  @ha-list-item-selected=${this._categoryAdded}
                  @ha-list-item-deselected=${this._categoryRemoved}
                >
                  ${repeat(
                    this._categories,
                    (category) => category.category_id,
                    (category) =>
                      html`<ha-list-item-option
                        appearance="checkbox"
                        selection-position="end"
                        .value=${category.category_id}
                        .selected=${
                          this.value?.includes(category.category_id) ?? false
                        }
                      >
                        ${
                          category.icon
                            ? html`<ha-icon
                                slot="start"
                                .icon=${category.icon}
                              ></ha-icon>`
                            : html`<ha-svg-icon
                                .path=${mdiTag}
                                slot="start"
                              ></ha-svg-icon>`
                        }
                        <span slot="headline">${category.name}</span>
                        <ha-dropdown
                          @click=${stopPropagation}
                          @keydown=${this._handleMenuKeydown}
                          @wa-select=${this._handleAction}
                          slot="end"
                          .categoryId=${category.category_id}
                        >
                          <ha-icon-button
                            .path=${mdiDotsVertical}
                            slot="trigger"
                            .label=${this.hass.localize("ui.common.menu")}
                          ></ha-icon-button>
                          <ha-dropdown-item value="edit">
                            <ha-svg-icon
                              slot="icon"
                              .path=${mdiPencil}
                            ></ha-svg-icon>
                            ${this.hass.localize(
                              "ui.panel.config.category.editor.edit"
                            )}
                          </ha-dropdown-item>
                          <ha-dropdown-item value="delete" variant="danger">
                            <ha-svg-icon
                              slot="icon"
                              .path=${mdiDelete}
                            ></ha-svg-icon>
                            ${this.hass.localize(
                              "ui.panel.config.category.editor.delete"
                            )}
                          </ha-dropdown-item>
                        </ha-dropdown>
                      </ha-list-item-option>`
                  )}
                </ha-list-selectable>
                <ha-list-item graphic="icon" @click=${this._addCategory}>
                  <ha-svg-icon slot="graphic" .path=${mdiPlus}></ha-svg-icon>
                  ${this.hass.localize("ui.panel.config.category.editor.add")}
                </ha-list-item>
              </div>
            `
          : nothing
      }
    `;
  }

  private _handleAction(ev: HaDropdownSelectEvent) {
    const categoryId = (ev.currentTarget as any).categoryId;
    const action = ev.detail.item.value;
    switch (action) {
      case "edit":
        this._editCategory(categoryId);
        break;
      case "delete":
        this._deleteCategory(categoryId);
        break;
    }
  }

  private _editCategory(id: string) {
    showCategoryRegistryDetailDialog(this, {
      scope: this.scope!,
      entry: this._categories.find((cat) => cat.category_id === id),
      updateEntry: (updates) =>
        updateCategoryRegistryEntry(this.hass, this.scope!, id, updates),
    });
  }

  private async _deleteCategory(id: string) {
    const confirm = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.category.editor.confirm_delete"
      ),
      text: this.hass.localize(
        "ui.panel.config.category.editor.confirm_delete_text"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirm) {
      return;
    }
    try {
      await deleteCategoryRegistryEntry(this.hass, this.scope!, id);

      if (this.value?.includes(id)) {
        this._setValue(this.value.filter((categoryId) => categoryId !== id));
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  private _addCategory() {
    if (!this.scope) {
      return;
    }
    showCategoryRegistryDetailDialog(this, {
      scope: this.scope,
      createEntry: (values) =>
        createCategoryRegistryEntry(this.hass, this.scope!, values),
    });
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  // The list toggles the focused row on Enter and Space, which would pick the
  // category instead of opening its menu.
  private _handleMenuKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.stopPropagation();
    }
  }

  private _categoryAdded(ev: CustomEvent<number>) {
    const categoryId = this._categories[ev.detail]?.category_id;

    if (!categoryId || this.value?.includes(categoryId)) {
      return;
    }

    this._setValue([...(this.value || []), categoryId]);
  }

  private _categoryRemoved(ev: CustomEvent<number>) {
    const categoryId = this._categories[ev.detail]?.category_id;

    if (!categoryId) {
      return;
    }

    this._setValue((this.value || []).filter((id) => id !== categoryId));
  }

  private _setValue(value: string[]) {
    this.value = value;

    fireEvent(this, "data-table-filter-changed", {
      value: value.length ? value : undefined,
      items: undefined,
    });
  }

  private _clearFilter(ev) {
    ev.preventDefault();
    this.value = undefined;
    fireEvent(this, "data-table-filter-changed", {
      value: undefined,
      items: undefined,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      filterPanelStyles,
      css`
        .header {
          display: flex;
          align-items: center;
        }
        .header ha-icon-button {
          margin-inline-start: auto;
          margin-inline-end: 8px;
        }
        .badge {
          display: inline-block;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: 0;
          min-width: 16px;
          box-sizing: border-box;
          border-radius: var(--ha-border-radius-circle);
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        /* The list scrolls through its own container, not through the host. */
        ha-list-selectable {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        ha-list-selectable::part(base) {
          flex: 1;
          min-height: 0;
        }
        /* Keeps a row with its menu button as tall as the other filters. */
        ha-list-item-option {
          --ha-row-item-padding-block: var(--ha-space-2);
        }
        ha-list-item-option ha-icon-button {
          --ha-icon-button-size: 32px;
        }
        ha-list-item {
          --mdc-list-item-graphic-margin: var(--ha-space-4);
        }
        ha-dropdown-item {
          font-size: var(--ha-font-size-m);
        }
        .warning {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-filter-categories": HaFilterCategories;
  }
}
