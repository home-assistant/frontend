import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import {
  mdiAlertCircleOutline,
  mdiDotsVertical,
  mdiFileDocument,
  mdiGit,
  mdiGithub,
  mdiInformation,
  mdiNewBox,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoize from "memoize-one";
import { relativeTime } from "../../homeassistant-frontend/src/common/datetime/relative_time";
import { storage } from "../../homeassistant-frontend/src/common/decorators/storage";
import { mainWindow } from "../../homeassistant-frontend/src/common/dom/get_main_window";
import { navigate } from "../../homeassistant-frontend/src/common/navigate";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  SortingDirection,
} from "../../homeassistant-frontend/src/components/data-table/ha-data-table";
import "../../homeassistant-frontend/src/layouts/hass-tabs-subpage-data-table";

import "../../homeassistant-frontend/src/components/ha-button-menu";
import "../../homeassistant-frontend/src/components/ha-fab";
import "../../homeassistant-frontend/src/components/ha-form/ha-form";
import "../../homeassistant-frontend/src/components/ha-markdown";
import "../../homeassistant-frontend/src/components/ha-menu";
import "../../homeassistant-frontend/src/components/ha-md-menu-item";

import { LocalizeFunc } from "../../homeassistant-frontend/src/common/translations/localize";
import { HaFormSchema } from "../../homeassistant-frontend/src/components/ha-form/types";
import { HaMenu } from "../../homeassistant-frontend/src/components/ha-menu";
import "../../homeassistant-frontend/src/components/ha-svg-icon";
import { PageNavigation } from "../../homeassistant-frontend/src/layouts/hass-tabs-subpage";
import { haStyle } from "../../homeassistant-frontend/src/resources/styles";
import type { HomeAssistant, Route } from "../../homeassistant-frontend/src/types";
import { brandsUrl } from "../../homeassistant-frontend/src/util/brands-url";
import {
  showHacsCustomRepositoriesDialog,
  showHacsFormDialog,
} from "../components/dialogs/show-hacs-dialog";
import { repositoryMenuItems } from "../components/hacs-repository-owerflow-menu";
import { aboutHacsmarkdownContent } from "../data/about";
import type { Hacs } from "../data/hacs";
import { APP_FULL_NAME } from "../data/hacs";
import { HacsLocalizeKeys } from "../data/localize";
import type { RepositoryBase, RepositoryType } from "../data/repository";
import { repositoriesClearNew } from "../data/websocket";
import { HacsStyles } from "../styles/hacs-common-style";
import { documentationUrl } from "../tools/documentation";
import { typeIcon } from "../tools/type-icon";
import { showAlertDialog } from "../../homeassistant-frontend/src/dialogs/generic/show-dialog-box";

const defaultKeyData = {
  title: "",
  filterable: true,
  hidden: true,
};

const STATUS_ORDER = ["pending-restart", "pending-upgrade", "installed", "new", "default"];

const TABS: PageNavigation[] = [
  {
    name: APP_FULL_NAME,
    path: "",
  },
];

@customElement("hacs-dashboard")
export class HacsDashboard extends LitElement {
  @property({ attribute: false }) public hacs!: Hacs;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @storage({ key: "hacs-dashboard-table-filtering", state: true, subscribe: false })
  private _activeFilters?: string[] = [];

  @storage({ key: "hacs-dashboard-table-sorting", state: false, subscribe: false })
  private _activeSorting?: { column: string; direction: SortingDirection };

  @storage({ key: "hacs-dashboard-table-grouping", state: true, subscribe: false })
  private _activeGrouping?: string;

  @storage({ key: "hacs-dashboard-table-collapsed", state: false, subscribe: false })
  private _activeCollapsed?: string[];

  @storage({ key: "hacs-dashboard-active-search", state: true, subscribe: false })
  private _activeSearch?: string;

  @storage({ key: "hacs-dashboard-table-hidden-columns", state: true, subscribe: false })
  private _hiddenTableColumns?: string[];

  @storage({ key: "hacs-dashboard-table-columns-ordering", state: true, subscribe: false })
  private _orderTableColumns?: string[];

  @query("#overflow-menu")
  private _overflowMenu!: HaMenu;

  @query("#repository-overflow-menu")
  private _repositoryOverflowMenu!: HaMenu;

  @state()
  private _overflowMenuRepository?: RepositoryBase;

  protected render = (): TemplateResult | void => {
    const repositories = this._filterRepositories(
      this.hacs.repositories,
      this.hacs.localize,
      this._activeFilters,
    );
    const repositoriesContainsNew = repositories.some((repository) => repository.new);

    return html`<hass-tabs-subpage-data-table
        .tabs=${TABS}
        .columns=${this._columns(this.hacs.localize, this.narrow)}
        .data=${repositories}
        .hass=${this.hass}
        ?iswide=${this.isWide}
        .localizeFunc=${this.hacs.localize as LocalizeFunc}
        main-page
        .narrow=${this.narrow}
        .route=${this.route}
        clickable
        .filter=${this._activeSearch || ""}
        has-filters
        hasFab
        .filters=${this._activeFilters?.length}
        .noDataText=${this.hacs.localize("dashboard.no_data")}
        .initialGroupColumn=${this._activeGrouping || "translated_status"}
        .initialCollapsedGroups=${this._activeCollapsed || []}
        .groupOrder=${this._groupOrder(this.hacs.localize, this._activeGrouping)}
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
        <ha-icon-button
          slot="toolbar-icon"
          .label=${this.hass.localize("ui.common.overflow_menu") || "overflow_menu"}
          .path=${mdiDotsVertical}
          @click=${this._showOverflowMenu}
        ></ha-icon-button>

        <ha-form
          slot="filter-pane"
          class="filters"
          .hass=${this.hass}
          .data=${{
            status: this._activeFilters?.find((filter) => filter.startsWith("status_")) || "",
            type: this._activeFilters?.find((filter) => filter.startsWith("type_")) || "",
          }}
          .schema=${this._filterSchema(this.hacs.localize, this.hacs.info.categories)}
          .computeLabel=${this._computeFilterFormLabel}
          @value-changed=${this._handleFilterChanged}
        ></ha-form>
      </hass-tabs-subpage-data-table>
      <ha-menu id="repository-overflow-menu" positioning="fixed">
        ${this._overflowMenuRepository
          ? repositoryMenuItems(this, this._overflowMenuRepository, this.hacs.localize).map(
              (entry) =>
                entry.divider
                  ? html`<li divider role="separator"></li>`
                  : html`
                      <ha-md-menu-item
                        class="${entry.error ? "error" : entry.warning ? "warning" : ""}"
                        .clickAction=${() => {
                          entry?.action && entry.action();
                        }}
                      >
                        <ha-svg-icon .path=${entry.path} slot="start"></ha-svg-icon>
                        <div slot="headline">${entry.label}</div>
                      </ha-md-menu-item>
                    `,
            )
          : nothing}
      </ha-menu>
      <ha-menu id="overflow-menu" positioning="fixed">
        <ha-md-menu-item
          .clickAction=${() => {
            mainWindow.open(documentationUrl({}), "_blank", "noreferrer=true");
          }}
        >
          <ha-svg-icon .path=${mdiFileDocument} slot="start"></ha-svg-icon>
          <div slot="headline">${this.hacs.localize("menu.documentation")}</div>
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${() => {
            mainWindow.open("https://github.com/hacs", "_blank", "noreferrer=true");
          }}
        >
          <ha-svg-icon .path=${mdiGithub} slot="start"></ha-svg-icon>
          <div slot="headline">GitHub</div>
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${() => {
            mainWindow.open(
              documentationUrl({
                path: "/docs/help/issues",
              }),
              "_blank",
              "noreferrer=true",
            );
          }}
        >
          <ha-svg-icon .path=${mdiAlertCircleOutline} slot="start"></ha-svg-icon>
          <div slot="headline">${this.hacs.localize("menu.open_issue")}</div>
        </ha-md-menu-item>
        <ha-md-menu-item
          .clickAction=${() => {
            if (!this.hacs.info.disabled_reason) {
              showHacsCustomRepositoriesDialog(this, {
                hacs: this.hacs,
              });
            } else {
              showAlertDialog(this, {
                title: "HACS is disabled",
                text: this.hacs.info.disabled_reason,
              });
            }
          }}
        >
          <ha-svg-icon .path=${mdiGit} slot="start"></ha-svg-icon>
          <div slot="headline">${this.hacs.localize("menu.custom_repositories")}</div>
        </ha-md-menu-item>
        ${repositoriesContainsNew
          ? html`<ha-md-menu-item
              .clickAction=${() => {
                repositoriesClearNew(this.hass, this.hacs);
              }}
            >
              <ha-svg-icon .path=${mdiNewBox} slot="start"></ha-svg-icon>
              <div slot="headline">${this.hacs.localize("menu.dismiss")}</div>
            </ha-md-menu-item>`
          : nothing}
        <ha-md-menu-item
          .clickAction=${() => {
            showHacsFormDialog(this, {
              hacs: this.hacs,
              title: APP_FULL_NAME,
              description: html`<ha-markdown
                .content=${aboutHacsmarkdownContent(this.hacs)}
              ></ha-markdown>`,
            });
          }}
        >
          <ha-svg-icon .path=${mdiInformation} slot="start"></ha-svg-icon>
          <div slot="headline">${this.hacs.localize("menu.about")}</div>
        </ha-md-menu-item>
      </ha-menu>`;
  };

  private _filterRepositories = memoize(
    (
      repositories: RepositoryBase[],
      localizeFunc: LocalizeFunc<HacsLocalizeKeys>,
      activeFilters?: string[],
    ): DataTableRowData[] =>
      repositories
        .filter((repository) => {
          if (
            activeFilters?.filter((filter) => filter.startsWith("status_")).length &&
            !activeFilters.includes(`status_${repository.status}`)
          ) {
            return false;
          }
          if (
            activeFilters?.filter((filter) => filter.startsWith("type_")).length &&
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
            localizeFunc(`repository_status.${repository.status}`) || repository.status,
          translated_category: localizeFunc(`common.type.${repository.category}`),
        })),
  );

  private _columns = memoize(
    (
      localizeFunc: LocalizeFunc<HacsLocalizeKeys>,
      narrow: boolean,
    ): DataTableColumnContainer<RepositoryBase> => ({
      icon: {
        title: "",
        label: localizeFunc("column.icon"),
        type: "icon",
        hidden: false,
        moveable: false,
        showNarrow: true,
        template: (repository: RepositoryBase) =>
          repository.category === "integration"
            ? html`
                <img
                  style="height: 32px; width: 32px"
                  slot="item-icon"
                  src=${brandsUrl({
                    domain: repository.domain || "invalid",
                    type: "icon",
                    useFallback: true,
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  referrerpolicy="no-referrer"
                />
              `
            : html`
                <ha-svg-icon
                  style="height: 32px; width: 32px; fill: var(--secondary-text-color);"
                  slot="item-icon"
                  .path=${typeIcon(repository.category)}
                ></ha-svg-icon>
              `,
      },
      name: {
        ...defaultKeyData,
        title: localizeFunc("column.name"),
        main: true,
        hidden: false,
        sortable: true,
        flex: 3,
        extraTemplate: (repository: RepositoryBase) =>
          !narrow ? html`<div class="secondary">${repository.description}</div>` : nothing,
      },
      downloads: {
        ...defaultKeyData,
        title: localizeFunc("column.downloads"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) => html`${repository.downloads || "-"}`,
      },
      stars: {
        ...defaultKeyData,
        title: localizeFunc("column.stars"),
        sortable: true,
        hidden: false,
      },
      last_updated: {
        ...defaultKeyData,
        title: localizeFunc("column.last_updated"),
        sortable: true,
        hidden: false,
        template: (repository: RepositoryBase) => {
          if (!repository.last_updated) {
            return "-";
          }
          try {
            return relativeTime(new Date(repository.last_updated), this.hass.locale);
          } catch (e) {
            return "-";
          }
        },
      },
      installed_version: {
        ...defaultKeyData,
        title: localizeFunc("column.installed_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.installed_version : "-",
      },
      available_version: {
        ...defaultKeyData,
        title: localizeFunc("column.available_version"),
        sortable: true,
        defaultHidden: true,
        hidden: false,
        template: (repository: RepositoryBase) =>
          repository.installed ? repository.available_version : "-",
      },
      translated_status: {
        ...defaultKeyData,
        title: localizeFunc("column.status"),
        sortable: true,
        groupable: true,
        hidden: false,
        defaultHidden: true,
      },
      translated_category: {
        ...defaultKeyData,
        title: localizeFunc("column.type"),
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
        label: localizeFunc("column.actions"),
        moveable: false,
        hideable: false,
        showNarrow: true,
        type: "overflow-menu",
        template: (repository: RepositoryBase) => html`
          <ha-icon-button
            .repository=${repository}
            .label=${this.hass.localize("ui.common.overflow_menu") || "overflow_menu"}
            .path=${mdiDotsVertical}
            @click=${this._showOverflowRepositoryMenu}
          ></ha-icon-button>
        `,
      },
    }),
  );

  private _showOverflowRepositoryMenu = (ev: any) => {
    if (
      this._repositoryOverflowMenu.open &&
      ev.target === this._repositoryOverflowMenu.anchorElement
    ) {
      this._repositoryOverflowMenu.close();
      return;
    }
    this._repositoryOverflowMenu.anchorElement = ev.target;
    this._overflowMenuRepository = ev.target.repository;
    this._repositoryOverflowMenu.show();
  };

  private _showOverflowMenu = (ev: any) => {
    if (this._overflowMenu.open) {
      this._overflowMenu.close();
      return;
    }
    this._overflowMenu.anchorElement = ev.target;
    this._overflowMenu.show();
  };

  private _groupOrder = memoize(
    (localize: LocalizeFunc<HacsLocalizeKeys>, activeGrouping: string | undefined) =>
      activeGrouping === "translated_status"
        ? STATUS_ORDER.map((filter) =>
            localize(
              // @ts-ignore
              `repository_status.${filter}`,
            ),
          )
        : undefined,
  );

  private _filterSchema = memoize(
    (localizeFunc: LocalizeFunc<HacsLocalizeKeys>, types: string[]) =>
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
                  // @ts-ignore
                  `repository_status.${filter}`,
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
                label: localizeFunc(`common.type.${type as RepositoryType}`),
                value: `type_${type}`,
              })),
              mode: "dropdown",
              sort: true,
            },
          },
        },
      ] as const satisfies readonly HaFormSchema[],
  );

  get _scrollerTarget() {
    return (
      this.shadowRoot
        ?.querySelector("hass-tabs-subpage-data-table")
        ?.shadowRoot?.querySelector("hass-tabs-subpage")
        ?.shadowRoot?.querySelector(".content")
        ?.querySelectorAll("SLOT")[0]
        // @ts-ignore
        ?.assignedNodes()
        ?.find((node) => node.nodeName === "HA-DATA-TABLE")
        ?.shadowRoot?.querySelector(".scroller")
    );
  }

  private _computeFilterFormLabel = (schema, _) =>
    this.hacs.localize(
      // @ts-ignore
      `dialog_overview.${schema.name}`,
    ) ||
    this.hacs.localize(
      // @ts-ignore
      `dialog_overview.sections.${schema.name}`,
    ) ||
    schema.name;

  private _handleRowClicked(ev: CustomEvent) {
    navigate(`/hacs/repository/${ev.detail.id}`);
  }

  private _handleFilterChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const data = ev.detail.value;
    const updatedFilters: string[] = Object.entries<any>(data)
      .filter(
        ([key, value]) =>
          ["status", "type"].includes(key) && ![undefined, null, ""].includes(value),
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
    return [haStyle, HacsStyles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hacs-dashboard": HacsDashboard;
  }
}
