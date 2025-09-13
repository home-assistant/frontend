import type { SelectedDetail } from "@material/mwc-list";
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
import { fireEvent } from "../common/dom/fire_event";
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
import "./ha-expansion-panel";
import "./ha-icon";
import "./ha-md-button-menu";
import "./ha-md-menu-item";
import "./ha-list";
import { stopPropagation } from "../common/dom/stop_propagation";

@customElement("ha-filter-categories")
export class HaFilterCategories extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property() public scope?: string;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public expanded = false;

  @state() private _categories: CategoryRegistryEntry[] = [];

  @state() private _shouldRender = false;

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
        @expanded-will-change=${this._expandedWillChange}
        @expanded-changed=${this._expandedChanged}
      >
        <div slot="header" class="header">
          ${this.hass.localize("ui.panel.config.category.caption")}
          ${this.value?.length
            ? html`<div class="badge">${this.value?.length}</div>
                <ha-icon-button
                  .path=${mdiFilterVariantRemove}
                  @click=${this._clearFilter}
                ></ha-icon-button>`
            : nothing}
        </div>
        ${this._shouldRender
          ? html`
              <ha-list
                @selected=${this._categorySelected}
                class="ha-scrollbar"
                activatable
              >
                ${this._categories.length > 0
                  ? html`<ha-list-item
                      .selected=${!this.value?.length}
                      .activated=${!this.value?.length}
                      >${this.hass.localize(
                        "ui.panel.config.category.filter.show_all"
                      )}</ha-list-item
                    >`
                  : nothing}
                ${this._categories.map(
                  (category) =>
                    html`<ha-list-item
                      .value=${category.category_id}
                      .selected=${this.value?.includes(category.category_id)}
                      .activated=${this.value?.includes(category.category_id)}
                      graphic="icon"
                      hasMeta
                    >
                      ${category.icon
                        ? html`<ha-icon
                            slot="graphic"
                            .icon=${category.icon}
                          ></ha-icon>`
                        : html`<ha-svg-icon
                            .path=${mdiTag}
                            slot="graphic"
                          ></ha-svg-icon>`}
                      ${category.name}
                      <ha-md-button-menu
                        @click=${stopPropagation}
                        slot="meta"
                        positioning="fixed"
                        .categoryId=${category.category_id}
                      >
                        <ha-icon-button
                          .path=${mdiDotsVertical}
                          slot="trigger"
                        ></ha-icon-button>
                        <ha-md-menu-item @click=${this._editCategoryClicked}
                          data-category-id=${category.category_id}
                          ><ha-svg-icon
                            .path=${mdiPencil}
                            slot="start"
                          ></ha-svg-icon
                          >${this.hass.localize(
                            "ui.panel.config.category.editor.edit"
                          )}</ha-md-menu-item
                        >
                        <ha-md-menu-item @click=${this._deleteCategoryClicked}
                          data-category-id=${category.category_id}
                          class="warning"
                          ><ha-svg-icon
                            class="warning"
                            .path=${mdiDelete}
                            slot="start"
                          ></ha-svg-icon
                          >${this.hass.localize(
                            "ui.panel.config.category.editor.delete"
                          )}</ha-md-menu-item
                        >
                      </ha-md-button-menu>
                    </ha-list-item>`
                )}
              </ha-list>
            `
          : nothing}
      </ha-expansion-panel>
      ${this.expanded
        ? html`<ha-list-item
            graphic="icon"
            @click=${this._addCategory}
            class="add"
          >
            <ha-svg-icon slot="graphic" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.category.editor.add")}
          </ha-list-item>`
        : nothing}
    `;
  }

  protected updated(changed) {
    if (changed.has("expanded") && this.expanded) {
      setTimeout(() => {
        if (!this.expanded) return;
        this.renderRoot.querySelector("ha-list")!.style.height =
          `${this.clientHeight - (49 + 48)}px`;
      }, 300);
    }
  }

  private _editCategoryClicked(ev: Event) {
    ev.stopPropagation();
    const categoryId = (ev.currentTarget as HTMLElement).getAttribute('data-category-id')!;
    this._editCategory(categoryId);
  }

  private _deleteCategoryClicked(ev: Event) {
    ev.stopPropagation();
    const categoryId = (ev.currentTarget as HTMLElement).getAttribute('data-category-id')!;
    this._deleteCategory(categoryId);
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
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
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

  private _expandedWillChange(ev) {
    this._shouldRender = ev.detail.expanded;
  }

  private _expandedChanged(ev) {
    this.expanded = ev.detail.expanded;
  }

  private async _categorySelected(ev: CustomEvent<SelectedDetail<number>>) {
    if (!ev.detail.index) {
      fireEvent(this, "data-table-filter-changed", {
        value: [],
        items: undefined,
      });
      this.value = [];
      return;
    }
    const index = ev.detail.index - 1;

    const val = this._categories![index]?.category_id;
    if (!val) {
      return;
    }
    this.value = [val];

    fireEvent(this, "data-table-filter-changed", {
      value: this.value,
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
      css`
        :host {
          border-bottom: 1px solid var(--divider-color);
          position: relative;
        }
        :host([expanded]) {
          flex: 1;
          height: 0;
        }
        ha-expansion-panel {
          --ha-card-border-radius: 0;
          --expansion-panel-content-padding: 0;
        }
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
          border-radius: 50%;
          font-size: var(--ha-font-size-xs);
          font-weight: var(--ha-font-weight-normal);
          background-color: var(--primary-color);
          line-height: var(--ha-line-height-normal);
          text-align: center;
          padding: 0px 2px;
          color: var(--text-primary-color);
        }
        ha-list {
          --mdc-list-item-meta-size: auto;
          --mdc-list-side-padding-right: 4px;
          --mdc-icon-button-size: 36px;
        }
        .warning {
          color: var(--error-color);
        }
        .add {
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
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
