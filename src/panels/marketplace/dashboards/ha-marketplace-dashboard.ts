import "@home-assistant/webawesome/dist/components/divider/divider";
import { mdiDotsVertical, mdiFileDocument, mdiGit, mdiNewBox } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../../common/datetime/relative_time";
import type { HASSDomCurrentTargetEvent } from "../../../common/dom/fire_event";
import { storage } from "../../../common/decorators/storage";
import { navigate } from "../../../common/navigate";
import type {
  DataTableColumnContainer,
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
import type { HaIconButton } from "../../../components/ha-icon-button";

import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HaFormSchema } from "../../../components/ha-form/types";
import "../../../components/ha-svg-icon";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { showMarketplaceCustomRepositoriesDialog } from "../dialogs/show-dialog-marketplace";
import type { MarketplaceRepositoryMenuItem } from "../components/ha-marketplace-repository-overflow-menu";
import { repositoryMenuItems } from "../components/ha-marketplace-repository-overflow-menu";
import type { MarketplaceData } from "../../../data/marketplace/marketplace";
import type {
  RepositoryBase,
  RepositoryType,
} from "../../../data/marketplace/repository";
import { repositoriesClearNew } from "../../../data/marketplace/websocket";
import { marketplaceStyles } from "../styles/marketplace-common-style";
import {
  DEFAULT_GROUP_COLUMN,
  filterRepositories,
  repositoryGroupOrder,
  STATUS_ORDER,
} from "./dashboard-repositories";
import { documentationUrl } from "../../../util/documentation-url";
import { typeIcon } from "../tools/type-icon";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";

const defaultKeyData = {
  title: "",
  filterable: true,
  hidden: true,
};

// The backend reports why the Marketplace is disabled, mapped so it can be shown
// as a translated sentence.
const DISABLED_REASONS = ["invalid_token", "rate_limit", "removed"] as const;

type DisabledReason = (typeof DISABLED_REASONS)[number];

const isKnownDisabledReason = (reason: string): reason is DisabledReason =>
  DISABLED_REASONS.includes(reason as DisabledReason);

// From the Marketplace translations, a direct visit does not load those of Settings
const TABS: PageNavigation[] = [
  {
    translationKey: "ui.panel.marketplace.title",
    path: "/marketplace",
  },
];

@customElement("ha-marketplace-dashboard")
export class HaMarketplaceDashboard extends LitElement {
  @property({ attribute: false }) public marketplace!: MarketplaceData;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ attribute: false }) public isWide!: boolean;

  @storage({
    key: "marketplace-dashboard-table-filtering",
    state: true,
    subscribe: false,
  })
  private _activeFilters?: string[] = [];

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
  private _activeGrouping?: string;

  @storage({
    key: "marketplace-dashboard-table-collapsed",
    state: false,
    subscribe: false,
  })
  private _activeCollapsed?: string[];

  @storage({
    key: "marketplace-dashboard-active-search",
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

  protected render(): TemplateResult {
    const repositories = this._filterRepositories(
      this.marketplace.repositories,
      this.hass.localize,
      this._activeFilters
    );
    // Dismissing clears all of them, not only the ones the filters show
    const repositoriesContainsNew = this.marketplace.repositories.some(
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
        .noDataText=${this.hass.localize("ui.panel.marketplace.dashboard.no_data")}
        .initialGroupColumn=${this._activeGrouping ?? DEFAULT_GROUP_COLUMN}
        .initialCollapsedGroups=${this._activeCollapsed || []}
        .groupOrder=${this._groupOrder(
          this.hass.localize,
          this._activeGrouping ?? DEFAULT_GROUP_COLUMN
        )}
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
            ${this.hass.localize("ui.panel.marketplace.menu.documentation")}
          </ha-dropdown-item>
          <ha-dropdown-item value="custom_repositories">
            <ha-svg-icon .path=${mdiGit} slot="icon"></ha-svg-icon>
            ${this.hass.localize("ui.panel.marketplace.menu.custom_repositories")}
          </ha-dropdown-item>
          ${
            repositoriesContainsNew
              ? html`<ha-dropdown-item value="dismiss_new">
                  <ha-svg-icon .path=${mdiNewBox} slot="icon"></ha-svg-icon>
                  ${this.hass.localize("ui.panel.marketplace.menu.dismiss")}
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
          .schema=${this._filterSchema(this.hass.localize, this.marketplace.info.categories)}
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

  private _filterRepositories = memoize(filterRepositories);

  private _columns = memoize(
    (
      localizeFunc: LocalizeFunc,
      narrow: boolean,
      darkMode?: boolean
    ): DataTableColumnContainer<RepositoryBase> => ({
      icon: {
        title: "",
        label: localizeFunc("ui.panel.marketplace.column.icon"),
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
        hidden: false,
        defaultHidden: true,
      },
      translated_category: {
        ...defaultKeyData,
        title: localizeFunc("ui.panel.marketplace.column.type"),
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
        label: localizeFunc("ui.panel.marketplace.column.actions"),
        moveable: false,
        hideable: false,
        showNarrow: true,
        type: "overflow-menu",
        template: (repository: RepositoryBase) => html`
          <ha-icon-button
            data-repository-id=${repository.id}
            .label=${this.hass.localize("ui.common.overflow_menu")}
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
      documentationUrl(this.hass, "/integrations/marketplace"),
      "_blank",
      "noreferrer=true"
    );
  }

  private _showCustomRepositories() {
    const disabledReason = this.marketplace.info.disabled_reason;
    if (disabledReason) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.marketplace.dialog.disabled.title"),
        text: isKnownDisabledReason(disabledReason)
          ? this.hass.localize(
              `ui.panel.marketplace.dialog.disabled.reason.${disabledReason}`
            )
          : this.hass.localize(
              "ui.panel.marketplace.dialog.disabled.reason.unknown"
            ),
      });
      return;
    }

    showMarketplaceCustomRepositoriesDialog(this, {
      marketplace: this.marketplace,
    });
  }

  private async _dismissNew() {
    try {
      await repositoriesClearNew(this.hass, this.marketplace);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.marketplace.dialog.error.title"),
        text:
          err?.message ||
          this.hass.localize("ui.panel.marketplace.common.unknown_error"),
      });
    }
  }

  private _groupOrder = memoize(repositoryGroupOrder);

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
                  `ui.panel.marketplace.repository_status.${filter}`
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
                  `ui.panel.marketplace.common.type.${type as RepositoryType}`
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
      ? this.hass.localize(
          "ui.panel.marketplace.dialog_overview.sections.filters"
        )
      : this.hass.localize(
          `ui.panel.marketplace.dialog_overview.${schema.name}`
        );

  private _handleRowClicked(ev: CustomEvent) {
    navigate(`/marketplace/repository/${ev.detail.id}`);
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
      marketplaceStyles,
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
    "ha-marketplace-dashboard": HaMarketplaceDashboard;
  }
}
