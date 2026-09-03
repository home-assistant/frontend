import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiDotsVertical, mdiFileDocument, mdiGit, mdiNewBox } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import { storage } from "../../../common/decorators/storage";
import { navigate } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  SortingDirection,
} from "../../../components/data-table/ha-data-table";
import "../../../layouts/hass-tabs-subpage-data-table";

import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type {
  HaDropdown,
  HaDropdownSelectEvent,
} from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-form/ha-form";
import "../../../components/ha-icon-button";

import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HaFormSchema } from "../../../components/ha-form/types";
import "../../../components/ha-svg-icon";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showStoreCustomRepositoriesDialog } from "../dialogs/show-dialog-store";
import type { StoreRepositoryMenuItem } from "../components/ha-store-repository-overflow-menu";
import { repositoryMenuItems } from "../components/ha-store-repository-overflow-menu";
import type { StoreData } from "../data/store";
import type { RepositoryBase, RepositoryType } from "../data/repository";
import { repositoriesClearNew } from "../data/websocket";
import { storeStyles } from "../styles/store-common-style";
import { storeDocumentationUrl } from "../tools/documentation";
import { typeIcon } from "../tools/type-icon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

const defaultKeyData = {
  title: "",
  filterable: true,
  hidden: true,
};

const STATUS_ORDER = [
  "pending-restart",
  "pending-upgrade",
  "installed",
  "new",
  "default",
] as const satisfies readonly RepositoryBase["status"][];

// The backend reports why the store is disabled, mapped so it can be shown
// as a translated sentence.
const DISABLED_REASONS = ["invalid_token", "rate_limit", "removed"] as const;

type DisabledReason = (typeof DISABLED_REASONS)[number];

const isKnownDisabledReason = (reason: string): reason is DisabledReason =>
  DISABLED_REASONS.includes(reason as DisabledReason);

const TABS: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.dashboard.store.main",
    path: "/store",
  },
];

@customElement("ha-store-dashboard")
export class HaStoreDashboard extends LitElement {
  @property({ attribute: false }) public store!: StoreData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ attribute: false }) public isWide!: boolean;

  @storage({
    key: "store-dashboard-table-filtering",
    state: true,
    subscribe: false,
  })
  private _activeFilters?: string[] = [];

  @storage({
    key: "store-dashboard-table-sorting",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: { column: string; direction: SortingDirection };

  @storage({
    key: "store-dashboard-table-grouping",
    state: true,
    subscribe: false,
  })
  private _activeGrouping?: string;

  @storage({
    key: "store-dashboard-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string[];

  @storage({
    key: "store-dashboard-active-search",
    state: true,
    subscribe: false,
  })
  private _activeSearch?: string;

  @storage({
    key: "store-dashboard-table-hidden-columns",
    state: true,
    subscribe: false,
  })
  private _hiddenTableColumns?: string[];

  @storage({
    key: "store-dashboard-table-columns-ordering",
    state: true,
    subscribe: false,
  })
  private _orderTableColumns?: string[];

  @query("#repository-overflow-menu")
  private _repositoryOverflowMenu!: HaDropdown;

  @state()
  private _overflowMenuRepository?: RepositoryBase;

  private _openingOverflowMenu = false;

  protected render(): TemplateResult {
    const repositories = this._filterRepositories(
      this.store.repositories,
      this.hass.localize,
      this._activeFilters
    );
    const repositoriesContainsNew = repositories.some(
      (repository) => repository.new
    );

    return html`<hass-tabs-subpage-data-table
        .tabs=${TABS}
        .columns=${this._columns(
          this.hass.localize,
          this.narrow,
          this.hass.themes?.darkMode
        )}
        .data=${repositories}
        .hass=${this.hass}
        .isWide=${this.isWide}
        .localizeFunc=${this.hass.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        clickable
        .filter=${this._activeSearch || ""}
        has-filters
        .filters=${this._activeFilters?.length}
        .noDataText=${this.hass.localize("ui.panel.store.dashboard.no_data")}
        .initialGroupColumn=${this._activeGrouping || "translated_status"}
        .initialCollapsedGroups=${this._activeCollapsed || []}
        .groupOrder=${this._groupOrder(this.hass.localize, this._activeGrouping)}
        .initialSorting=${this._activeSorting}
        .columnOrder=${this._orderTableColumns}
        .hiddenColumns=${this._hiddenTableColumns}
        @columns-changed=${this._handleColumnsChanged}
        @row-click=${this._handleRowClicked}
        @clear-filter=${this._handleClearFilter}
        @value-changed=${this._handleSearchFilterChanged}
        @sorting-changed=${this._handleSortingChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
      >
        <ha-dropdown slot="toolbar-icon" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.overflow_menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="documentation">
            <ha-svg-icon .path=${mdiFileDocument} slot="icon"></ha-svg-icon>
            ${this.hass.localize("ui.panel.store.menu.documentation")}
          </ha-dropdown-item>
          <ha-dropdown-item value="custom_repositories">
            <ha-svg-icon .path=${mdiGit} slot="icon"></ha-svg-icon>
            ${this.hass.localize("ui.panel.store.menu.custom_repositories")}
          </ha-dropdown-item>
          ${
            repositoriesContainsNew
              ? html`<ha-dropdown-item value="dismiss_new">
                  <ha-svg-icon .path=${mdiNewBox} slot="icon"></ha-svg-icon>
                  ${this.hass.localize("ui.panel.store.menu.dismiss")}
                </ha-dropdown-item>`
              : nothing
          }
        </ha-dropdown>

        <ha-form
          slot="filter-pane"
          class="filters"
          .hass=${this.hass}
          .data=${{
            status:
              this._activeFilters?.find((filter) =>
                filter.startsWith("status_")
              ) || "",
            type:
              this._activeFilters?.find((filter) =>
                filter.startsWith("type_")
              ) || "",
          }}
          .schema=${this._filterSchema(this.hass.localize, this.store.info.categories)}
          .computeLabel=${this._computeFilterFormLabel}
          @value-changed=${this._handleFilterChanged}
        ></ha-form>
      </hass-tabs-subpage-data-table>
      <ha-dropdown
        id="repository-overflow-menu"
        @wa-select=${this._handleOverflowAction}
        @wa-after-show=${this._overflowMenuOpened}
        @wa-after-hide=${this._overflowMenuClosed}
      >
        ${
          this._overflowMenuRepository
            ? repositoryMenuItems(
                this,
                this._overflowMenuRepository,
                this.hass.localize
              ).map((entry) =>
                "divider" in entry
                  ? html`<wa-divider></wa-divider>`
                  : html`
                      <ha-dropdown-item
                        .value=${entry.value}
                        variant=${entry.variant || "default"}
                      >
                        <ha-svg-icon
                          .path=${entry.path}
                          slot="icon"
                        ></ha-svg-icon>
                        ${entry.label}
                      </ha-dropdown-item>
                    `
              )
            : nothing
        }
      </ha-dropdown>`;
  }

  private _filterRepositories = memoize(
    (
      repositories: RepositoryBase[],
      localizeFunc: LocalizeFunc,
      activeFilters?: string[]
    ): DataTableRowData[] =>
      repositories
        .filter((repository) => {
          if (
            activeFilters?.filter((filter) => filter.startsWith("status_"))
              .length &&
            !activeFilters.includes(`status_${repository.status}`)
          ) {
            return false;
          }
          if (
            activeFilters?.filter((filter) => filter.startsWith("type_"))
              .length &&
            !activeFilters.includes(`type_${repository.category}`)
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
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
        })
        .map((repository) => ({
          ...repository,
          translated_status:
            localizeFunc(
              `ui.panel.store.repository_status.${repository.status}`
            ) || repository.status,
          translated_category: localizeFunc(
            `ui.panel.store.common.type.${repository.category}`
          ),
        }))
  );

  private _columns = memoize(
    (
      localizeFunc: LocalizeFunc,
      narrow: boolean,
      darkMode?: boolean
    ): DataTableColumnContainer<RepositoryBase> => ({
      icon: {
        title: "",
        label: localizeFunc("ui.panel.store.column.icon"),
        type: "icon",
        hidden: false,
        moveable: false,
        showNarrow: true,
        template: (repository: RepositoryBase) =>
          repository.category === "integration"
            ? html`
                <img
                  class="repository-icon"
                  slot="item-icon"
                  alt=""
                  src=${brandsUrl({
                    domain: repository.domain || "invalid",
                    type: "icon",
                    darkOptimized: darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
              `
            : html`
                <ha-svg-icon
                  class="repository-icon"
                  slot="item-icon"
                  .path=${typeIcon(repository.category)}
                ></ha-svg-icon>
              `,
      },
      name: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.name"),
        main: true,
        hidden: false,
        sortable: true,
        flex: 3,
        extraTemplate: (repository: RepositoryBase) =>
          !narrow
            ? html`<div class="secondary">${repository.description}</div>`
            : nothing,
      },
      downloads: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.downloads"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          html`${repository.downloads || "-"}`,
      },
      stars: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.stars"),
        sortable: true,
        hidden: false,
      },
      last_updated: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.last_updated"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) => {
          if (!repository.last_updated) {
            return "-";
          }
          try {
            return relativeTime(
              new Date(repository.last_updated),
              this.hass.locale
            );
          } catch {
            return "-";
          }
        },
      },
      installed_version: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.installed_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.installed_version : "-",
      },
      available_version: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.available_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.available_version : "-",
      },
      translated_status: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.status"),
        sortable: true,
        groupable: true,
        hidden: false,
        defaultHidden: true,
      },
      translated_category: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.store.column.type"),
        sortable: true,
        groupable: true,
        hidden: false,
      },
      description: defaultKeyData,
      authors: defaultKeyData,
      domain: defaultKeyData,
      full_name: defaultKeyData,
      id: defaultKeyData,
      topics: defaultKeyData,
      actions: {
        title: "",
        label: localizeFunc("ui.panel.store.column.actions"),
        moveable: false,
        hideable: false,
        showNarrow: true,
        type: "overflow-menu",
        template: (repository: RepositoryBase) => html`
          <ha-icon-button
            .repository=${repository}
            .label=${this.hass.localize("ui.common.overflow_menu")}
            .path=${mdiDotsVertical}
            @click=${this._showOverflowRepositoryMenu}
          ></ha-icon-button>
        `,
      },
    })
  );

  private _showOverflowRepositoryMenu = (ev) => {
    if (this._repositoryOverflowMenu.anchorElement === ev.target) {
      this._repositoryOverflowMenu.anchorElement = undefined;
      return;
    }
    this._openingOverflowMenu = true;
    this._repositoryOverflowMenu.anchorElement = ev.target;
    this._overflowMenuRepository = ev.target.repository;
    this._repositoryOverflowMenu.open = true;
  };

  private _handleMenuAction = (ev: HaDropdownSelectEvent) => {
    switch (ev.detail.item.value) {
      case "documentation":
        this._openDocumentation();
        break;
      case "custom_repositories":
        this._showCustomRepositories();
        break;
      case "dismiss_new":
        this._dismissNew();
        break;
    }
  };

  private _handleOverflowAction = (ev: HaDropdownSelectEvent) => {
    if (!this._overflowMenuRepository) {
      return;
    }

    repositoryMenuItems(this, this._overflowMenuRepository, this.hass.localize)
      .filter((entry): entry is StoreRepositoryMenuItem => "value" in entry)
      .find((entry) => entry.value === ev.detail.item.value)
      ?.action();
  };

  private _overflowMenuOpened = () => {
    this._openingOverflowMenu = false;
  };

  private _overflowMenuClosed = () => {
    // Changing the anchor element fires a close event, ignore that one.
    if (this._openingOverflowMenu) {
      return;
    }

    this._repositoryOverflowMenu.anchorElement = undefined;
  };

  private _openDocumentation() {
    window.open(storeDocumentationUrl(), "_blank", "noreferrer=true");
  }

  private _showCustomRepositories() {
    const disabledReason = this.store.info.disabled_reason;
    if (disabledReason) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.store.dialog.disabled.title"),
        text: isKnownDisabledReason(disabledReason)
          ? this.hass.localize(
              `ui.panel.store.dialog.disabled.reason.${disabledReason}`
            )
          : this.hass.localize("ui.panel.store.dialog.disabled.reason.unknown"),
      });
      return;
    }

    showStoreCustomRepositoriesDialog(this, { store: this.store });
  }

  private async _dismissNew() {
    try {
      await repositoriesClearNew(this.hass, this.store);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.store.dialog.error.title"),
        text:
          err?.message ||
          this.hass.localize("ui.panel.store.common.unknown_error"),
      });
    }
  }

  private _groupOrder = memoize(
    (localize: LocalizeFunc, activeGrouping: string | undefined) =>
      activeGrouping === "translated_status"
        ? STATUS_ORDER.map((filter) =>
            localize(`ui.panel.store.repository_status.${filter}`)
          )
        : undefined
  );

  private _filterSchema = memoize(
    (localizeFunc: LocalizeFunc, types: string[]) =>
      [
        {
          name: "filters",
          type: "constant",
          value: "",
        },
        {
          name: "status",
          selector: {
            select: {
              options: STATUS_ORDER.map((filter) => ({
                value: `status_${filter}`,
                label: localizeFunc(
                  `ui.panel.store.repository_status.${filter}`
                ),
              })),
              mode: "dropdown",
              sort: false,
            },
          },
        },
        {
          name: "type",
          selector: {
            select: {
              options: types.map((type: string) => ({
                label: localizeFunc(
                  `ui.panel.store.common.type.${type as RepositoryType}`
                ),
                value: `type_${type}`,
              })),
              mode: "dropdown",
              sort: true,
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  private _computeFilterFormLabel = (schema: {
    name: "filters" | "status" | "type";
  }): string =>
    schema.name === "filters"
      ? this.hass.localize("ui.panel.store.dialog_overview.sections.filters")
      : this.hass.localize(`ui.panel.store.dialog_overview.${schema.name}`);

  private _handleRowClicked(ev: CustomEvent) {
    navigate(`/store/repository/${ev.detail.id}`);
  }

  private _handleFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const data = ev.detail.value;
    const updatedFilters: string[] = Object.entries<any>(data)
      .filter(
        ([key, value]) =>
          ["status", "type"].includes(key) &&
          ![undefined, null, ""].includes(value)
      )
      .map(([_, value]) => value);
    this._activeFilters = updatedFilters.length ? updatedFilters : undefined;
  }

  private _handleSearchFilterChanged(ev: CustomEvent) {
    this._activeSearch = ev.detail.value;
  }

  private _handleGroupingChanged(ev: CustomEvent) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(ev: CustomEvent) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._orderTableColumns = ev.detail.columnOrder;
    this._hiddenTableColumns = ev.detail.hiddenColumns;
  }

  private _handleClearFilter() {
    this._activeFilters = undefined;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      storeStyles,
      css`
        .repository-icon {
          height: 32px;
          width: 32px;
        }
        ha-svg-icon.repository-icon {
          fill: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-store-dashboard": HaStoreDashboard;
  }
}
