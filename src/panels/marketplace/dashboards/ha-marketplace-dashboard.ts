import "@home-assistant/webawesome/dist/components/divider/divider";
import type { ContextType } from "@lit/context";
import {
  mdiCheckCircleOutline,
  mdiCompassOutline,
  mdiDotsVertical,
  mdiLinkPlus,
  mdiOpenInNew,
  mdiStore,
  mdiViewGridOutline,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { keyed } from "lit/directives/keyed";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { consume } from "../../../common/decorators/consume";
import { storage } from "../../../common/decorators/storage";
import { transform } from "../../../common/decorators/transform";
import { mainWindow } from "../../../common/dom/get_main_window";
import { navigate, updateHistoryState } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
  SortingDirection,
} from "../../../components/data-table/ha-data-table";
import "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";

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
import type { HomeAssistantUI, Route } from "../../../types";
import { showMarketplaceAddFromLink } from "../tools/add-from-link";
import "../components/ha-marketplace-discover";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import {
  renderRepositoryMenuEntry,
  repositoryMenuItems,
} from "../components/ha-marketplace-repository-overflow-menu";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import {
  apiContext,
  configContext,
  internationalizationContext,
  uiContext,
} from "../../../data/context";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import { marketplaceErrorMessage } from "../../../data/marketplace/websocket";
import { dismissNewMarketplaceRepositories } from "../../../data/marketplace/repository";
import { haStyle } from "../../../resources/styles";
import {
  browseSettingsFromUrl,
  filterRepositories,
  STATUS_FILTER,
  STATUS_ORDER,
  TYPE_FILTER,
} from "./dashboard-repositories";
import type { RepositoryFilters } from "./dashboard-repositories";
import { documentationUrl } from "../../../util/documentation-url";
import { renderRepositoryIcon } from "../tools/repository-icon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

const defaultKeyData = {
  title: "",
  filterable: true,
  hidden: true,
};

// From the Marketplace translations, a direct visit does not load those of Settings
export type MarketplaceTab = "discover" | "browse" | "installed";

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

// Marks the history entry of a link once it is applied. Back and forward
// return to that entry and keep what was picked after it, following a link
// makes a new entry, which applies what it says again. The router keeps the
// page of a tab, so it is often not around to hear the navigation itself.
const APPLIED_LINK_STATE = "marketplaceAppliedLink";

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

  // The table takes its sorting once, every link applied gets it a new one
  @state() private _linksApplied = 0;

  public connectedCallback() {
    super.connectedCallback();
    window.addEventListener("location-changed", this._applyLink);
    window.addEventListener("popstate", this._applyLink);
    if (this.hasUpdated) {
      this._applyLink();
    }
  }

  // Stored settings ignore what is set before the first update
  protected willUpdate() {
    if (!this.hasUpdated) {
      this._applyLink();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("location-changed", this._applyLink);
    window.removeEventListener("popstate", this._applyLink);
  }

  // Links, like See all on Discover, say in the URL how to browse. The router
  // keeps the page of a tab, so a link often lands on a page that is open.
  private _applyLink = () => {
    const search = mainWindow.location.search;
    if (mainWindow.history.state?.[APPLIED_LINK_STATE] === search) {
      return;
    }

    const settings = browseSettingsFromUrl(search);
    if (!settings) {
      return;
    }

    updateHistoryState({ [APPLIED_LINK_STATE]: search });
    this._linksApplied++;
    // A search left behind would hide part of what the link promised
    this._activeSearch = "";
    this._filters = settings.filters;
    if (settings.sorting) {
      this._activeSorting = settings.sorting;
    }
  };

  protected render(): TemplateResult {
    const tabs = this._tabs(
      this._i18n.localize,
      this.marketplace.repositories.filter(
        (repository) => repository.pending_upgrade
      ).length
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

    const repositories = this._filterRepositories(
      this._repositoriesOfTab(this.marketplace.repositories, this.tab),
      this._i18n.localize,
      this._filters
    );

    return html`${keyed(
        this._linksApplied,
        html`<hass-tabs-subpage-data-table
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
          .filter=${this._activeSearch || ""}
          has-filters
          .filters=${
            Object.values(this._filters).filter((values) => values?.length)
              .length
          }
          .noDataText=${this._i18n.localize("ui.panel.marketplace.dashboard.no_data")}
          .empty=${!this.marketplace.repositories.length}
          .initialSorting=${this._activeSorting}
          .columnOrder=${this._orderTableColumns}
          .hiddenColumns=${this._hiddenTableColumns}
          @columns-changed=${this._handleColumnsChanged}
          @row-click=${this._handleRowClicked}
          @clear-filter=${this._handleClearFilter}
          @search-changed=${this._handleSearchFilterChanged}
          @sorting-changed=${this._handleSortingChanged}
        >
          ${this._renderToolbar()}
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
            .value=${this._filters[STATUS_FILTER]}
            .states=${this._statusStates(this._i18n.localize)}
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
        </hass-tabs-subpage-data-table>`
      )}
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

  private _filterRepositories = memoize(filterRepositories);

  private _columns = memoize(
    (
      localizeFunc: LocalizeFunc,
      narrow: boolean,
      darkMode: boolean | undefined,
      markInstalled: boolean
    ): DataTableColumnContainer<RepositoryBase> => ({
      icon: {
        title: "",
        label: localizeFunc("ui.panel.marketplace.column.icon"),
        type: "icon",
        hidden: false,
        moveable: false,
        showNarrow: true,
        template: (repository: RepositoryBase) =>
          renderRepositoryIcon(repository, {
            darkMode,
            hassUrl: this._config.auth.data.hassUrl,
            installedLabel: markInstalled
              ? localizeFunc("ui.panel.marketplace.repository_status.installed")
              : undefined,
            updateLabel: localizeFunc(
              "ui.panel.marketplace.repository_status.pending-upgrade"
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
        template: (repository: RepositoryBase) =>
          html`${repository.downloads || "-"}`,
      },
      stars: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.stars"),
        sortable: true,
        hidden: false,
      },
      last_updated: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.last_updated"),
        sortable: true,
        valueColumn: "last_updated_timestamp",
        type: "numeric",
        hidden: false,
        template: (repository: RepositoryBase) => {
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
        hidden: false,
        defaultHidden: true,
      },
      translated_category: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.type"),
        sortable: true,
        hidden: false,
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

  private _statusStates = memoize((localize: LocalizeFunc) =>
    STATUS_ORDER.map((status) => ({
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

  private _handleRowClicked(ev: CustomEvent) {
    navigate(`/marketplace/repository/${ev.detail.id}`);
  }

  private _statusFilterChanged(ev: CustomEvent<{ value: string[] }>) {
    this._filters = { ...this._filters, [STATUS_FILTER]: ev.detail.value };
  }

  private _typeFilterChanged(ev: CustomEvent<{ value: string[] }>) {
    this._filters = { ...this._filters, [TYPE_FILTER]: ev.detail.value };
  }

  private _handleSearchFilterChanged(ev: CustomEvent) {
    this._activeSearch = ev.detail.value;
  }

  private _handleSortingChanged(ev: CustomEvent) {
    this._activeSorting = ev.detail;
  }

  private _handleColumnsChanged(ev: CustomEvent) {
    this._orderTableColumns = ev.detail.columnOrder;
    this._hiddenTableColumns = ev.detail.hiddenColumns;
  }

  private _handleClearFilter() {
    this._filters = {};
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
