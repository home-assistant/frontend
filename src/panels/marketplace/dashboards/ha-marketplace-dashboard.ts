import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import type { HassEntities } from "home-assistant-js-websocket";
import {
  mdiCheckCircleOutline,
  mdiCompassOutline,
  mdiDotsVertical,
  mdiDownload,
  mdiLinkPlus,
  mdiOpenInNew,
  mdiStar,
  mdiStore,
  mdiViewGridOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomEvent,
} from "../../../common/dom/fire_event";
import { consume } from "../../../common/decorators/consume";
import { consumeEntityStates } from "../../../common/decorators/consume-context-entry";
import { storage } from "../../../common/decorators/storage";
import { transform } from "../../../common/decorators/transform";
import { QueryParamsController } from "../../../common/controllers/query-params-controller";
import { navigate } from "../../../common/navigate";
import { formatNumber } from "../../../common/number/format_number";
import { marketplaceFilterQueryParamConfig } from "../../../common/url/marketplace-query-params";
import { shallowEqual } from "../../../common/util/shallow-equal";
import type {
  DataTableColumnContainer,
  SelectionChangedEvent,
  SortingDirection,
} from "../../../components/data-table/ha-data-table";
import "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";

import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type {
  HaDropdown,
  HaDropdownSelectEvent,
} from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-filter-states";
import "../../../components/ha-icon-button";
import type { HaIconButton } from "../../../components/ha-icon-button";

import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-svg-icon";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistantUI, Route } from "../../../types";
import { showMarketplaceAddFromLink } from "../tools/add-from-link";
import "../components/ha-marketplace-discover";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import {
  renderRepositoryMenuEntry,
  repositoryMenuItems,
} from "../components/ha-marketplace-repository-overflow-menu";
import type { ConfigEntry } from "../../../data/config_entries";
import {
  deleteConfigEntry,
  getConfigEntries,
} from "../../../data/config_entries";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import {
  apiContext,
  configContext,
  devicesContext,
  entitiesContext,
  internationalizationContext,
  uiContext,
} from "../../../data/context";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import { marketplaceErrorMessage } from "../../../data/marketplace/websocket";
import {
  dismissNewMarketplaceRepositories,
  uninstallMarketplaceRepository,
} from "../../../data/marketplace/repository";
import { haStyle } from "../../../resources/styles";
import {
  applySkippedUpdates,
  browseLinkFromUrl,
  filterRepositories,
  filtersOfTab,
  marketplaceUpdateEntityIds,
  skippedUpdateRepositories,
  SOURCE_FILTER,
  SOURCE_ORDER,
  STATUS_FILTER,
  STATUS_ORDER,
  statusesOfTab,
  statusFilterOfTab,
  TYPE_FILTER,
} from "./dashboard-repositories";
import type {
  MarketplaceRepository,
  RepositoryFilters,
} from "./dashboard-repositories";
import { documentationUrl } from "../../../util/documentation-url";
import { renderRepositoryIcon } from "../tools/repository-icon";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";

const defaultKeyData = {
  title: "",
  filterable: true,
  hidden: true,
};

// From the Marketplace translations, a direct visit does not load those of Settings
export type MarketplaceTab = "discover" | "browse" | "installed";

const compact = { notation: "compact" } as const;

const marketplaceTabs = (
  localize: LocalizeFunc,
  updates: number
): PageNavigation[] => [
  {
    translationKey: "ui.panel.marketplace.tabs.discover",
    path: "/marketplace/discover",
    iconPath: mdiCompassOutline,
  },
  {
    translationKey: "ui.panel.marketplace.tabs.browse",
    path: "/marketplace/browse",
    iconPath: mdiViewGridOutline,
  },
  {
    translationKey: "ui.panel.marketplace.tabs.installed",
    path: "/marketplace/installed",
    iconPath: mdiCheckCircleOutline,
    badge: updates
      ? localize("ui.panel.marketplace.tabs.updates", { count: updates })
      : undefined,
  },
];

// The installed tab lists what is installed, the others everything
const repositoriesOfTab = (
  repositories: RepositoryBase[],
  tab: MarketplaceTab
): RepositoryBase[] =>
  tab === "installed"
    ? repositories.filter((repository) => repository.installed)
    : repositories;

@customElement("ha-marketplace-dashboard")
export class HaMarketplaceDashboard extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public tab: MarketplaceTab = "browse";

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ attribute: false }) public isWide!: boolean;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consumeEntityStates({ entityIdPath: ["_marketplaceUpdateEntityIds"] })
  private _states?: HassEntities;

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private _devices!: ContextType<typeof devicesContext>;

  @state() private _marketplaceUpdateEntityIds: string[] = [];

  @storage({
    storage: "sessionStorage",
    key: "marketplace-dashboard-table-filters",
    state: true,
    subscribe: false,
  })
  private _filters: RepositoryFilters = {};

  @storage({
    key: "marketplace-dashboard-table-sorting",
    state: false,
    subscribe: false,
  })
  private _activeSorting?: { column: string; direction: SortingDirection };

  @storage({
    key: "marketplace-dashboard-table-grouping",
    state: true,
    subscribe: false,
  })
  private _activeGrouping?: string = "translated_status";

  @storage({
    key: "marketplace-dashboard-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed: string[] = [];

  @storage({
    storage: "sessionStorage",
    key: "marketplace-dashboard-table-search",
    state: true,
    subscribe: false,
  })
  private _activeSearch?: string;

  @storage({
    key: "marketplace-dashboard-table-hidden-columns",
    state: true,
    subscribe: false,
  })
  private _hiddenTableColumns?: string[];

  @storage({
    key: "marketplace-dashboard-table-columns-ordering",
    state: true,
    subscribe: false,
  })
  private _orderTableColumns?: string[];

  @query("#repository-overflow-menu")
  private _repositoryOverflowMenu!: HaDropdown;

  @state()
  private _overflowMenuRepository?: RepositoryBase;

  private _openingOverflowMenu = false;

  @state() private _selected: string[] = [];

  @state() private _checkingSelection = false;

  @query("hass-tabs-subpage-data-table", true)
  private _dataTable!: HaTabsSubpageDataTable;

  // The filters are kept in the URL by the page, the search, sorting and
  // grouping by the table
  private _filterParams = new QueryParamsController(
    this,
    marketplaceFilterQueryParamConfig,
    {
      enabled: () => this.tab !== "discover",
      navigated: () => this._applyLink(),
    }
  );

  // Stored settings ignore what is set before the first update
  protected willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this._applyLink();
    }

    // The states of these are only selected after this runs, so the skipped
    // updates are worked out in render
    if (changedProps.has("_entities")) {
      this._marketplaceUpdateEntityIds = marketplaceUpdateEntityIds(
        this._entities
      );
    }
  }

  // Links, like See all on Discover, say in the URL what to show. The router
  // keeps the page of a tab, so a link often lands on a page that is open.
  private _applyLink() {
    const searchParams = this._filterParams.searchParams();
    const link = searchParams ? browseLinkFromUrl(searchParams) : undefined;

    if (link) {
      this._activeSearch = link.search;
      this._filters = {
        ...link.filters,
        [STATUS_FILTER]: statusFilterOfTab(
          this._filters,
          this.tab,
          link.filters[STATUS_FILTER]
        ),
      };
    }

    this._writeFilters();
  }

  private _writeFilters() {
    this._filterParams.write(filtersOfTab(this._filters, this.tab));
  }

  protected render(): TemplateResult {
    const marketplaceRepositories = this._applySkippedUpdates(
      this.marketplace.repositories,
      this._skippedUpdateRepositories(
        this._marketplaceUpdateEntityIds,
        this._entities,
        this._devices,
        this._states ?? {}
      )
    );
    const tabs = this._tabs(
      this._i18n.localize,
      marketplaceRepositories.filter((repository) => repository.pending_upgrade)
        .length
    );

    if (this.tab === "discover") {
      return html`<hass-tabs-subpage
        .tabs=${tabs}
        .localizeFunc=${this._i18n.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
      >
        ${this._renderToolbar()}
        <ha-marketplace-discover
          .marketplace=${this.marketplace}
        ></ha-marketplace-discover>
      </hass-tabs-subpage>`;
    }

    const filters = this._filtersOfTab(this._filters, this.tab);
    const repositories = this._filterRepositories(
      this._repositoriesOfTab(marketplaceRepositories, this.tab),
      this._i18n.localize,
      filters
    );

    return html`<hass-tabs-subpage-data-table
        .tabs=${tabs}
        .columns=${this._columns(
          this._i18n.localize,
          this.narrow,
          this._darkMode,
          // Everything on the installed tab is, a mark would say nothing
          this.tab !== "installed"
        )}
        .data=${repositories}
        .searchLabel=${this._i18n.localize(
          "ui.panel.marketplace.dashboard.search",
          { number: repositories.length }
        )}
        .isWide=${this.isWide}
        .localizeFunc=${this._i18n.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config"
        clickable
        sync-url
        .filter=${this._activeSearch || ""}
        has-filters
        .filters=${
          Object.values(filters).filter((values) => values?.length).length
        }
        .noDataText=${this._i18n.localize("ui.panel.marketplace.dashboard.no_data")}
        .empty=${!this.marketplace.repositories.length}
        .initialSorting=${this._activeSorting}
        .initialGroupColumn=${this._activeGrouping}
        .initialCollapsedGroups=${this._activeCollapsed}
        .groupOrder=${this._groupOrder(
          this._activeGrouping,
          this._i18n.localize
        )}
        .columnOrder=${this._orderTableColumns}
        .hiddenColumns=${this._hiddenTableColumns}
        @columns-changed=${this._handleColumnsChanged}
        @grouping-changed=${this._handleGroupingChanged}
        @collapsed-changed=${this._handleCollapseChanged}
        @row-click=${this._handleRowClicked}
        ?selectable=${this.tab === "installed"}
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        @clear-filter=${this._handleClearFilter}
        @search-changed=${this._handleSearchFilterChanged}
        @sorting-changed=${this._handleSortingChanged}
      >
        ${this._renderToolbar()}
        ${
          this.tab === "installed"
            ? html`<ha-assist-chip
                slot="selection-bar"
                .label=${this._i18n.localize(
                  "ui.panel.marketplace.dashboard.uninstall_selected"
                )}
                .disabled=${!this._selected.length || this._checkingSelection}
                @click=${this._uninstallSelected}
              ></ha-assist-chip>`
            : nothing
        }
        ${
          this.marketplace.repositories.length
            ? nothing
            : html`<div class="empty" slot="empty">
                <ha-svg-icon .path=${mdiStore}></ha-svg-icon>
                <h1>
                  ${this._i18n.localize("ui.panel.marketplace.dashboard.empty_header")}
                </h1>
                <p>
                  ${this._i18n.localize("ui.panel.marketplace.dashboard.empty_text")}
                </p>
                <ha-button
                  href=${documentationUrl(this._config, "/integrations/marketplace")}
                  target="_blank"
                  appearance="plain"
                  rel="noreferrer"
                  size="s"
                >
                  ${this._i18n.localize("ui.panel.marketplace.common.learn_more")}
                  <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                </ha-button>
              </div>`
        }
        <ha-filter-states
          slot="filter-pane"
          .label=${this._i18n.localize("ui.panel.marketplace.filters.status")}
          .value=${filters[STATUS_FILTER]}
          .states=${this._statusStates(this._i18n.localize, this.tab)}
          .narrow=${this.narrow}
          @data-table-filter-changed=${this._statusFilterChanged}
        ></ha-filter-states>
        <ha-filter-states
          slot="filter-pane"
          .label=${this._i18n.localize("ui.panel.marketplace.filters.type")}
          .value=${this._filters[TYPE_FILTER]}
          .states=${this._typeStates(
            this._i18n.localize,
            this.marketplace.info.categories
          )}
          .narrow=${this.narrow}
          @data-table-filter-changed=${this._typeFilterChanged}
        ></ha-filter-states>
        <ha-filter-states
          slot="filter-pane"
          .label=${this._i18n.localize("ui.panel.marketplace.filters.source")}
          .value=${this._filters[SOURCE_FILTER]}
          .states=${this._sourceStates(this._i18n.localize)}
          .narrow=${this.narrow}
          @data-table-filter-changed=${this._sourceFilterChanged}
        ></ha-filter-states>
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
                this._api,
                this._overflowMenuRepository,
                this._i18n.localize
              ).map(renderRepositoryMenuEntry)
            : nothing
        }
      </ha-dropdown>`;
  }

  private _renderToolbar() {
    // Dismissing clears all of them, not only the ones the filters show
    const repositoriesContainsNew = this.marketplace.repositories.some(
      (repository) => repository.new
    );

    const addFromLink = this._i18n.localize(
      "ui.panel.marketplace.tabs.add_from_link"
    );

    // The toolbar slot does not line up what is in it, this row centres them
    return html`<div class="toolbar-actions" slot="toolbar-icon">
      ${
        this.narrow
          ? html`<ha-icon-button
              class="add-from-link"
              .label=${addFromLink}
              .path=${mdiLinkPlus}
              @click=${this._addFromLink}
            ></ha-icon-button>`
          : html`<ha-button
              class="add-from-link"
              appearance="outlined"
              size="s"
              @click=${this._addFromLink}
            >
              <ha-svg-icon slot="start" .path=${mdiLinkPlus}></ha-svg-icon>
              ${addFromLink}
            </ha-button>`
      }
      <ha-dropdown @wa-select=${this._handleMenuAction}>
        <ha-icon-button
          slot="trigger"
          .label=${this._i18n.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-dropdown-item value="documentation">
          ${this._i18n.localize("ui.panel.marketplace.menu.documentation")}
        </ha-dropdown-item>
        <ha-dropdown-item value="custom_repositories">
          ${this._i18n.localize("ui.panel.marketplace.menu.custom_repositories")}
        </ha-dropdown-item>
        ${
          repositoriesContainsNew
            ? html`<ha-dropdown-item value="dismiss_new">
                ${this._i18n.localize("ui.panel.marketplace.menu.dismiss")}
              </ha-dropdown-item>`
            : nothing
        }
      </ha-dropdown>
    </div>`;
  }

  private _tabs = memoize(marketplaceTabs);

  private _repositoriesOfTab = memoize(repositoriesOfTab);

  private _skippedUpdateRepositories = memoize(skippedUpdateRepositories);

  // Registry changes give a new list of the same skipped updates, the table is
  // left as it is
  private _applySkippedUpdates = memoize(
    applySkippedUpdates,
    ([repositories, skipped], [lastRepositories, lastSkipped]) =>
      repositories === lastRepositories && shallowEqual(skipped, lastSkipped)
  );

  private _filterRepositories = memoize(filterRepositories);

  private _filtersOfTab = memoize(filtersOfTab);

  private _columns = memoize(
    (
      localizeFunc: LocalizeFunc,
      narrow: boolean,
      darkMode: boolean | undefined,
      markInstalled: boolean
    ): DataTableColumnContainer<MarketplaceRepository> => ({
      icon: {
        title: "",
        label: localizeFunc("ui.panel.marketplace.column.icon"),
        type: "icon",
        hidden: false,
        moveable: false,
        showNarrow: true,
        template: (repository: MarketplaceRepository) =>
          renderRepositoryIcon(repository, {
            darkMode,
            hassUrl: this._config.auth.data.hassUrl,
            installedLabel: markInstalled
              ? localizeFunc("ui.panel.marketplace.repository_status.installed")
              : undefined,
            updateLabel: localizeFunc(
              "ui.panel.marketplace.repository_status.pending-upgrade"
            ),
            skippedLabel: localizeFunc(
              "ui.panel.marketplace.repository_status.update_skipped"
            ),
          }),
      },
      name: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.name"),
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
        title: localizeFunc("ui.panel.marketplace.column.downloads"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) => {
          if (!repository.downloads) {
            return narrow ? nothing : "-";
          }

          return html`${
            narrow
              ? html`<ha-svg-icon .path=${mdiDownload}></ha-svg-icon>`
              : nothing
          }${formatNumber(repository.downloads, this._i18n.locale, compact)}`;
        },
      },
      stars: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.stars"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          html`${
            narrow
              ? html`<ha-svg-icon .path=${mdiStar}></ha-svg-icon>`
              : nothing
          }${formatNumber(repository.stars, this._i18n.locale, compact)}`,
      },
      last_updated: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.last_updated"),
        sortable: true,
        valueColumn: "last_updated_timestamp",
        type: "numeric",
        hidden: false,
        template: (repository: RepositoryBase) => {
          // A bare relative time has no context on narrow rows, the overview shows it
          if (narrow) {
            return nothing;
          }
          if (!repository.last_updated) {
            return "-";
          }
          try {
            return relativeTime(
              new Date(repository.last_updated),
              this._i18n.locale
            );
          } catch {
            return "-";
          }
        },
      },
      installed_version: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.installed_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.installed_version : "-",
      },
      available_version: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.available_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.available_version : "-",
      },
      translated_status: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.status"),
        sortable: true,
        groupable: true,
        urlName: "status",
        hidden: false,
        defaultHidden: true,
      },
      translated_category: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.type"),
        sortable: true,
        groupable: true,
        urlName: "type",
        hidden: false,
      },
      translated_source: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.source"),
        sortable: true,
        groupable: true,
        urlName: "source",
        hidden: false,
        defaultHidden: true,
      },
      description: defaultKeyData,
      authors: defaultKeyData,
      domain: defaultKeyData,
      full_name: defaultKeyData,
      id: defaultKeyData,
      topics: defaultKeyData,
      actions: {
        lastFixed: true,
        title: "",
        label: localizeFunc("ui.panel.marketplace.column.actions"),
        moveable: false,
        hideable: false,
        showNarrow: true,
        type: "overflow-menu",
        template: (repository: RepositoryBase) => html`
          <ha-icon-button
            data-repository-id=${repository.id}
            .label=${this._i18n.localize("ui.common.overflow_menu")}
            .path=${mdiDotsVertical}
            @click=${this._showOverflowRepositoryMenu}
          ></ha-icon-button>
        `,
      },
    })
  );

  private _showOverflowRepositoryMenu = (
    ev: HASSDomCurrentTargetEvent<HaIconButton>
  ) => {
    const button = ev.currentTarget;
    if (this._repositoryOverflowMenu.anchorElement === button) {
      this._repositoryOverflowMenu.anchorElement = undefined;
      return;
    }
    this._openingOverflowMenu = true;
    this._repositoryOverflowMenu.anchorElement = button;
    this._overflowMenuRepository = this.marketplace.repositories.find(
      (repository) => repository.id === button.dataset.repositoryId
    );
    this._repositoryOverflowMenu.open = true;
  };

  private _handleSelectionChanged = (
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void => {
    this._selected = ev.detail.value;
  };

  private _uninstallSelected = async () => {
    const selectedRepositories = this.marketplace.repositories.filter(
      (repository) => this._selected.includes(repository.id)
    );
    if (!selectedRepositories.length) {
      return;
    }

    this._checkingSelection = true;
    try {
      const domains = [
        ...new Set(
          selectedRepositories.flatMap((repository) =>
            repository.category === "integration" && repository.domain
              ? [repository.domain]
              : []
          )
        ),
      ];
      const entriesChecks = await Promise.allSettled(
        domains.map((domain) => getConfigEntries(this._api, { domain }))
      );
      const checkErrors = entriesChecks
        .filter(
          (check): check is PromiseRejectedResult => check.status === "rejected"
        )
        .map((check) =>
          marketplaceErrorMessage(check.reason, this._i18n.localize)
        );
      if (checkErrors.length) {
        showAlertDialog(this, {
          title: this._i18n.localize(
            "ui.panel.marketplace.dialog.uninstall.check_failed_title"
          ),
          text: html`
            <p>
              ${this._i18n.localize(
                "ui.panel.marketplace.dialog.uninstall.check_failed"
              )}
            </p>
            <pre>${checkErrors.join("\n")}</pre>
          `,
        });
        return;
      }

      const entriesByDomain = new Map<string, ConfigEntry[]>();
      domains.forEach((domain, index) => {
        const check = entriesChecks[index];
        if (check.status === "fulfilled" && check.value.length) {
          entriesByDomain.set(domain, check.value);
        }
      });
      const inUseCount = selectedRepositories.filter(
        (repository) =>
          repository.category === "integration" &&
          repository.domain &&
          entriesByDomain.has(repository.domain)
      ).length;

      const failures: string[] = [];
      showConfirmationDialog(this, {
        title: this._i18n.localize(
          "ui.panel.marketplace.dialog.uninstall.selected_title"
        ),
        text: this._i18n.localize(
          inUseCount
            ? "ui.panel.marketplace.dialog.uninstall.selected_in_use"
            : "ui.panel.marketplace.dialog.uninstall.selected",
          {
            count: selectedRepositories.length,
            ...(inUseCount ? { in_use: inUseCount } : {}),
          }
        ),
        confirmText: this._i18n.localize(
          "ui.panel.marketplace.common.uninstall"
        ),
        dismissText: this._i18n.localize("ui.common.cancel"),
        destructive: true,
        action: async () => {
          const units = new Map<string, RepositoryBase[]>();
          selectedRepositories.forEach((repository) => {
            const key = repository.domain ?? repository.id;
            const unit = units.get(key);
            if (unit) {
              unit.push(repository);
            } else {
              units.set(key, [repository]);
            }
          });
          const unitList = [...units.values()];
          const results = await Promise.allSettled(
            unitList.map(async (unit) => {
              const entries = entriesByDomain.get(unit[0].domain ?? "") ?? [];
              for (const entry of entries) {
                // eslint-disable-next-line no-await-in-loop
                await deleteConfigEntry(this._api, entry.entry_id);
              }
              for (const repository of unit) {
                // eslint-disable-next-line no-await-in-loop
                await uninstallMarketplaceRepository(this._api, repository.id);
              }
            })
          );
          unitList.forEach((unit, index) => {
            const result = results[index];
            if (result.status === "rejected") {
              const error = marketplaceErrorMessage(
                result.reason,
                this._i18n.localize
              );
              unit.forEach((repository) =>
                failures.push(`${repository.name}: ${error}`)
              );
            }
          });
          this._dataTable.clearSelection();
        },
      }).then((confirmed) => {
        if (confirmed && failures.length) {
          showAlertDialog(this, {
            title: this._i18n.localize(
              "ui.panel.marketplace.dialog.uninstall.failed_title"
            ),
            text: html`
              <p>
                ${this._i18n.localize(
                  "ui.panel.marketplace.dialog.uninstall.failed"
                )}
              </p>
              <pre>${failures.join("\n")}</pre>
            `,
          });
        }
      });
    } finally {
      this._checkingSelection = false;
    }
  };

  private _handleMenuAction = (ev: HaDropdownSelectEvent) => {
    switch (ev.detail.item.value) {
      case "documentation":
        this._openDocumentation();
        break;
      case "custom_repositories":
        navigate("/marketplace/repositories");
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

    repositoryMenuItems(
      this,
      this._api,
      this._overflowMenuRepository,
      this._i18n.localize
    )
      .filter(
        (entry): entry is MarketplaceRepositoryMenuItem => "value" in entry
      )
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
    window.open(
      documentationUrl(this._config, "/integrations/marketplace"),
      "_blank",
      "noreferrer=true"
    );
  }

  private _addFromLink() {
    showMarketplaceAddFromLink(this, this._i18n.localize, this.marketplace);
  }

  private async _dismissNew() {
    try {
      await dismissNewMarketplaceRepositories(
        this._api,
        this.marketplace.info.categories
      );
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this._i18n.localize("ui.panel.marketplace.dialog.error.title"),
        text: marketplaceErrorMessage(err, this._i18n.localize),
      });
    }
  }

  private _statusStates = memoize(
    (localize: LocalizeFunc, tab: MarketplaceTab) =>
      statusesOfTab(tab).map((status) => ({
        value: status,
        label: localize(`ui.panel.marketplace.repository_status.${status}`),
      }))
  );

  private _typeStates = memoize(
    (localize: LocalizeFunc, types: RepositoryType[]) =>
      types.map((type) => ({
        value: type,
        label: localize(`ui.panel.marketplace.common.type.${type}`),
      }))
  );

  private _sourceStates = memoize((localize: LocalizeFunc) =>
    SOURCE_ORDER.map((source) => ({
      value: source,
      label: localize(`ui.panel.marketplace.repository_source.${source}`),
    }))
  );

  // Statuses and sources group in the order of their filters, not alphabetically
  private _groupOrder = memoize(
    (grouping: string | undefined, localize: LocalizeFunc) => {
      if (grouping === "translated_status") {
        return STATUS_ORDER.map((status) =>
          localize(`ui.panel.marketplace.repository_status.${status}`)
        );
      }

      if (grouping === "translated_source") {
        return SOURCE_ORDER.map((source) =>
          localize(`ui.panel.marketplace.repository_source.${source}`)
        );
      }

      return undefined;
    }
  );

  private _handleRowClicked(ev: CustomEvent) {
    navigate(`/marketplace/repository/${ev.detail.id}`);
  }

  // The pane's own clear button sends no value
  private _statusFilterChanged(ev: HASSDomEvent<{ value?: string[] }>) {
    this._filters = {
      ...this._filters,
      [STATUS_FILTER]: statusFilterOfTab(
        this._filters,
        this.tab,
        ev.detail.value
      ),
    };
    this._writeFilters();
  }

  private _typeFilterChanged(ev: CustomEvent<{ value: string[] }>) {
    this._filters = { ...this._filters, [TYPE_FILTER]: ev.detail.value };
    this._writeFilters();
  }

  private _sourceFilterChanged(ev: CustomEvent<{ value: string[] }>) {
    this._filters = { ...this._filters, [SOURCE_FILTER]: ev.detail.value };
    this._writeFilters();
  }

  private _handleSearchFilterChanged(ev: CustomEvent) {
    this._activeSearch = ev.detail.value;
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleGroupingChanged(
    ev: HASSDomEvent<HASSDomEvents["grouping-changed"]>
  ) {
    this._activeGrouping = ev.detail.value;
  }

  private _handleCollapseChanged(
    ev: HASSDomEvent<HASSDomEvents["collapsed-changed"]>
  ) {
    this._activeCollapsed = ev.detail.value;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._orderTableColumns = ev.detail.columnOrder;
    this._hiddenTableColumns = ev.detail.hiddenColumns;
  }

  private _handleClearFilter() {
    this._filters = {};
    this._writeFilters();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
        }
        .empty {
          --mdc-icon-size: 80px;
          max-width: 500px;
        }
        .empty ha-button {
          --mdc-icon-size: 24px;
        }
        .empty h1 {
          font-size: var(--ha-font-size-3xl);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-marketplace-dashboard": HaMarketplaceDashboard;
  }
}
