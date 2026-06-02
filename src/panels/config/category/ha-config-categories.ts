import {
  mdiDelete,
  mdiHelpCircleOutline,
  mdiPalette,
  mdiPencil,
  mdiPlus,
  mdiRobot,
  mdiScriptText,
  mdiTag,
  mdiTools,
} from "@mdi/js";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { storage } from "../../../common/decorators/storage";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-overflow-menu";
import "../../../components/ha-svg-icon";
import type {
  CategoryRegistryEntry,
  CategoryRegistryEntryMutableParams,
} from "../../../data/category_registry";
import {
  createCategoryRegistryEntry,
  deleteCategoryRegistryEntry,
  subscribeCategoryRegistry,
  updateCategoryRegistryEntry,
} from "../../../data/category_registry";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import type { HomeAssistant, Route } from "../../../types";
import { areaConfigTabs } from "../common/area-config-tabs";
import {
  getCreatedAtTableColumn,
  getModifiedAtTableColumn,
} from "../common/data-table-columns";
import { confirmDeleteCategory } from "./confirm-delete-category";
import { showCategoryRegistryDetailDialog } from "./show-dialog-category-registry-detail";

const CATEGORY_SCOPE_CONFIGS = [
  {
    scope: "automation",
    icon: mdiRobot,
    translationKey: "ui.panel.config.automation.caption",
  },
  {
    scope: "scene",
    icon: mdiPalette,
    translationKey: "ui.panel.config.scene.caption",
  },
  {
    scope: "script",
    icon: mdiScriptText,
    translationKey: "ui.panel.config.script.caption",
  },
  {
    scope: "helpers",
    icon: mdiTools,
    translationKey: "ui.panel.config.helpers.caption",
  },
] as const;

type CategoryScope = (typeof CATEGORY_SCOPE_CONFIGS)[number]["scope"];

type CategoriesByScope = Record<CategoryScope, CategoryRegistryEntry[]>;

interface CategoryRowData extends CategoryRegistryEntry, DataTableRowData {
  id: string;
  scope: CategoryScope;
  scopeName: string;
}

const EMPTY_CATEGORIES_BY_SCOPE: CategoriesByScope = {
  automation: [],
  scene: [],
  script: [],
  helpers: [],
};

@customElement("ha-config-categories")
export class HaConfigCategories extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _categories: CategoriesByScope = EMPTY_CATEGORIES_BY_SCOPE;

  @state()
  @storage({
    storage: "sessionStorage",
    key: "categories-table-search",
    state: true,
    subscribe: false,
  })
  private _filter = "";

  private _columns = memoizeOne((localize: LocalizeFunc) => {
    const columns: DataTableColumnContainer<CategoryRowData> = {
      icon: {
        title: "",
        moveable: false,
        showNarrow: true,
        label: localize("ui.panel.config.category.headers.icon"),
        type: "icon",
        template: (category) =>
          category.icon
            ? html`<ha-icon .icon=${category.icon}></ha-icon>`
            : html`<ha-svg-icon .path=${mdiTag}></ha-svg-icon>`,
      },
      name: {
        title: localize("ui.panel.config.category.headers.name"),
        main: true,
        flex: 2,
        sortable: true,
        filterable: true,
      },
      scopeName: {
        title: localize("ui.panel.config.category.headers.scope"),
        defaultHidden: true,
        groupable: true,
        filterable: true,
        sortable: true,
      },
      created_at: getCreatedAtTableColumn(localize, this.hass),
      modified_at: getModifiedAtTableColumn(localize, this.hass),
      actions: {
        lastFixed: true,
        title: "",
        label: localize("ui.panel.config.generic.headers.actions"),
        showNarrow: true,
        type: "overflow-menu",
        template: (category) => html`
          <ha-icon-overflow-menu
            narrow
            .items=${[
              {
                label: this.hass.localize(
                  "ui.panel.config.category.editor.edit"
                ),
                path: mdiPencil,
                action: () => this._openDialog(category.scope, category),
              },
              {
                label: this.hass.localize(
                  "ui.panel.config.category.editor.delete"
                ),
                path: mdiDelete,
                action: () => this._deleteCategory(category),
                warning: true,
              },
            ]}
          ></ha-icon-overflow-menu>
        `,
      },
    };
    return columns;
  });

  private _data = memoizeOne(
    (
      categories: CategoriesByScope,
      localize: LocalizeFunc
    ): CategoryRowData[] =>
      CATEGORY_SCOPE_CONFIGS.flatMap((scopeConfig) =>
        categories[scopeConfig.scope].map((category) => ({
          ...category,
          id: `${scopeConfig.scope}:${category.category_id}`,
          scope: scopeConfig.scope,
          scopeName: localize(scopeConfig.translationKey),
        }))
      )
  );

  private _groupOrder = memoizeOne((localize: LocalizeFunc) =>
    CATEGORY_SCOPE_CONFIGS.map((scopeConfig) =>
      localize(scopeConfig.translationKey)
    )
  );

  protected hassSubscribe() {
    return CATEGORY_SCOPE_CONFIGS.map((scopeConfig) =>
      subscribeCategoryRegistry(
        this.hass.connection,
        scopeConfig.scope,
        (categories) => this._setCategories(scopeConfig.scope, categories)
      )
    );
  }

  protected render() {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${areaConfigTabs}
        .columns=${this._columns(this.hass.localize)}
        .data=${this._data(this._categories, this.hass.localize)}
        .noDataText=${this.hass.localize(
          "ui.panel.config.category.no_categories"
        )}
        has-fab
        .initialGroupColumn=${"scopeName"}
        .groupOrder=${this._groupOrder(this.hass.localize)}
        .filter=${this._filter}
        @search-changed=${this._handleSearchChange}
        @row-click=${this._editCategory}
        clickable
        id="id"
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircleOutline}
        ></ha-icon-button>
        <ha-dropdown slot="fab" @wa-select=${this._handleCreateScope}>
          <ha-button slot="trigger" id="fab" size="large">
            <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.category.editor.create")}
          </ha-button>
          ${CATEGORY_SCOPE_CONFIGS.map(
            (scopeConfig) => html`
              <ha-dropdown-item .value=${scopeConfig.scope}>
                <ha-svg-icon
                  .path=${scopeConfig.icon}
                  slot="icon"
                ></ha-svg-icon>
                ${this.hass.localize(scopeConfig.translationKey)}
              </ha-dropdown-item>
            `
          )}
        </ha-dropdown>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.category.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.category.introduction")}
        <p>${this.hass.localize("ui.panel.config.category.introduction2")}</p>
      `,
    });
  }

  private _setCategories(
    scope: CategoryScope,
    categories: CategoryRegistryEntry[]
  ) {
    this._categories = {
      ...this._categories,
      [scope]: categories,
    };
  }

  private _handleCreateScope = (ev: HaDropdownSelectEvent<CategoryScope>) => {
    this._openDialog(ev.detail.item.value);
  };

  private _editCategory(ev: CustomEvent<RowClickedEvent>) {
    const category = this._data(this._categories, this.hass.localize).find(
      (row) => row.id === ev.detail.id
    );
    if (!category) {
      return;
    }
    this._openDialog(category.scope, category);
  }

  private _openDialog(scope: CategoryScope, entry?: CategoryRegistryEntry) {
    showCategoryRegistryDetailDialog(this, {
      scope,
      entry,
      createEntry: entry
        ? undefined
        : (values) => this._createCategory(scope, values),
      updateEntry: entry
        ? (values) => this._updateCategory(scope, entry, values)
        : undefined,
    });
  }

  private async _createCategory(
    scope: CategoryScope,
    values: CategoryRegistryEntryMutableParams
  ): Promise<CategoryRegistryEntry> {
    const category = await createCategoryRegistryEntry(
      this.hass,
      scope,
      values
    );
    this._setCategories(scope, [...this._categories[scope], category]);
    return category;
  }

  private async _updateCategory(
    scope: CategoryScope,
    entry: CategoryRegistryEntry,
    values: Partial<CategoryRegistryEntryMutableParams>
  ): Promise<CategoryRegistryEntry> {
    const category = await updateCategoryRegistryEntry(
      this.hass,
      scope,
      entry.category_id,
      values
    );
    this._setCategories(
      scope,
      this._categories[scope].map((current) =>
        current.category_id === entry.category_id ? category : current
      )
    );
    return category;
  }

  private async _deleteCategory(entry: CategoryRowData) {
    if (!(await confirmDeleteCategory(this, this.hass))) {
      return;
    }
    try {
      await deleteCategoryRegistryEntry(
        this.hass,
        entry.scope,
        entry.category_id
      );
      this._setCategories(
        entry.scope,
        this._categories[entry.scope].filter(
          (category) => category.category_id !== entry.category_id
        )
      );
    } catch (err: unknown) {
      showAlertDialog(this, {
        text:
          err instanceof Error
            ? err.message
            : this.hass.localize(
                "ui.panel.config.category.editor.unknown_error"
              ),
      });
    }
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-categories": HaConfigCategories;
  }
}
