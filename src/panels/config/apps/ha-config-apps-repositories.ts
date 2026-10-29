import { mdiDelete, mdiDeleteOff, mdiMenuDown, mdiPlus } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/chips/ha-assist-chip";
import type {
  DataTableColumnContainer,
  SelectionChangedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type {
  HassioAddonInfo,
  HassioAddonRepository,
  HassioAddonsInfo,
} from "../../../data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  addStoreRepository,
  fetchStoreRepositories,
  removeStoreRepository,
} from "../../../data/supervisor/store";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import "../../../layouts/hass-tabs-subpage-data-table";
import type { HaTabsSubpageDataTable } from "../../../layouts/hass-tabs-subpage-data-table";
import type { HomeAssistant, Route } from "../../../types";

interface RepositoryRowData {
  slug: string;
  name: string;
  maintainer: string;
  url: string;
  selectable: boolean;
}

const pageTabs: PageNavigation[] = [
  {
    translationKey: "ui.panel.config.apps.store.repositories",
    path: "/config/apps/repositories",
  },
];

@customElement("ha-config-apps-repositories")
export class HaConfigAppsRepositories extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _repositories?: HassioAddonRepository[];

  @state() private _addon?: HassioAddonsInfo;

  @state() private _error?: string;

  @state() private _selected: string[] = [];

  @state() private _removing = false;

  @query("hass-tabs-subpage-data-table")
  private _dataTable?: HaTabsSubpageDataTable;

  protected firstUpdated() {
    this._loadData();
  }

  protected willUpdate(changedProperties: PropertyValues) {
    if (
      changedProperties.has("_addon") &&
      this._addon &&
      this._addon.addons.some((addon) =>
        this._selected.includes(addon.repository)
      )
    ) {
      this._dataTable?.clearSelection();
    }
  }

  private _columns = memoizeOne(
    (
      localize: HomeAssistant["localize"],
      usedRepositories: string[]
    ): DataTableColumnContainer<RepositoryRowData> => ({
      name: {
        title: localize("ui.panel.config.apps.store.repositories"),
        main: true,
        sortable: true,
        filterable: true,
        direction: "asc" as const,
        flex: 2,
      },
      maintainer: {
        title: localize("ui.panel.config.apps.repositories.maintainer"),
        sortable: true,
        filterable: true,
        flex: 1,
      },
      url: {
        title: localize("ui.panel.config.apps.repositories.url"),
        sortable: true,
        filterable: true,
        flex: 2,
      },
      actions: {
        title: "",
        label: localize("ui.panel.config.apps.repositories.remove"),
        type: "icon-button",
        showNarrow: true,
        lastFixed: true,
        template: (row) => {
          const used = usedRepositories.includes(row.slug);
          return html`
            <ha-tooltip .for="delete-btn-${row.slug}">
              ${localize(
                used
                  ? "ui.panel.config.apps.repositories.used"
                  : "ui.panel.config.apps.repositories.remove"
              )}
            </ha-tooltip>
            <ha-icon-button
              .id="delete-btn-${row.slug}"
              .disabled=${used}
              .slug=${row.slug}
              .path=${used ? mdiDeleteOff : mdiDelete}
              @click=${this._removeRepository}
              class="delete"
            ></ha-icon-button>
          `;
        },
      },
    })
  );

  private _filteredRepositories = memoizeOne((repos: HassioAddonRepository[]) =>
    repos
      .filter(
        (repo) =>
          repo.slug !== "core" &&
          repo.slug !== "local" &&
          repo.slug !== "a0d7b954" &&
          repo.slug !== "5c53de3b" &&
          repo.slug !== "d5369777"
      )
      .sort((a, b) =>
        caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
      )
  );

  private _filteredUsedRepositories = memoizeOne(
    (repos: HassioAddonRepository[], addons: HassioAddonInfo[]) =>
      repos
        .filter((repo) =>
          addons.some((addon) => addon.repository === repo.slug)
        )
        .map((repo) => repo.slug)
  );

  private _data = memoizeOne(
    (
      repos: HassioAddonRepository[],
      usedRepositories: string[]
    ): RepositoryRowData[] =>
      repos.map((repo) => ({
        slug: repo.slug,
        name: repo.name,
        maintainer: repo.maintainer,
        url: repo.url,
        selectable: !usedRepositories.includes(repo.slug),
      }))
  );

  protected render() {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._repositories || !this._addon) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    const repositories = this._filteredRepositories(this._repositories);
    const usedRepositories = this._filteredUsedRepositories(
      repositories,
      this._addon.addons
    );

    const removeLabel = this.hass.localize(
      "ui.panel.config.apps.repositories.remove_selected"
    );

    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${pageTabs}
        back-path="/config/apps/available"
        .columns=${this._columns(this.hass.localize, usedRepositories)}
        .data=${this._data(repositories, usedRepositories)}
        .noDataText=${this.hass.localize(
          "ui.panel.config.apps.repositories.no_repositories"
        )}
        id="slug"
        selectable
        .selected=${this._selected.length}
        @selection-changed=${this._handleSelectionChanged}
        has-fab
      >
        ${
          this.narrow
            ? html`<ha-dropdown
                slot="selection-bar"
                @wa-select=${this._removeSelected}
              >
                <ha-assist-chip
                  slot="trigger"
                  .label=${this.hass.localize(
                    "ui.panel.config.automation.picker.bulk_action"
                  )}
                >
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiMenuDown}
                  ></ha-svg-icon>
                </ha-assist-chip>
                <ha-dropdown-item
                  value="remove"
                  .disabled=${!this._selected.length || this._removing}
                >
                  ${removeLabel}
                </ha-dropdown-item>
              </ha-dropdown>`
            : html`<ha-assist-chip
                slot="selection-bar"
                .label=${removeLabel}
                .disabled=${!this._selected.length || this._removing}
                @click=${this._removeSelected}
              ></ha-assist-chip>`
        }
        <ha-button slot="fab" size="l" @click=${this._showAddRepositoryDialog}>
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.apps.repositories.add")}
        </ha-button>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleSelectionChanged = (
    ev: HASSDomEvent<SelectionChangedEvent>
  ): void => {
    this._selected = ev.detail.value;
  };

  private _removeSelected = async () => {
    if (this._removing || !this._repositories) {
      return;
    }
    const selectedRepositories = this._repositories.filter((repo) =>
      this._selected.includes(repo.slug)
    );
    if (!selectedRepositories.length) {
      return;
    }

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.apps.repositories.remove_selected_title"
      ),
      text: this.hass.localize(
        "ui.panel.config.apps.repositories.remove_selected_text",
        { count: selectedRepositories.length }
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.apps.repositories.remove"
      ),
      dismissText: this.hass.localize("ui.common.cancel"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    this._removing = true;
    let results: PromiseSettledResult<void>[];
    try {
      results = await Promise.allSettled(
        selectedRepositories.map((repo) =>
          removeStoreRepository(this.hass, repo.slug)
        )
      );
      this._dataTable?.clearSelection();
      await this._loadData();
      fireEvent(this, "apps-collection-refresh", { collection: "store" });
    } finally {
      this._removing = false;
    }

    const failures = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            `${selectedRepositories[index].name}: ${extractApiErrorMessage(
              result.reason
            )}`,
          ]
        : []
    );
    if (failures.length) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.apps.repositories.remove_failed_title"
        ),
        text: html`
          <p>
            ${this.hass.localize(
              "ui.panel.config.apps.repositories.remove_failed"
            )}
          </p>
          <pre>${failures.join("\n")}</pre>
        `,
      });
    }
  };

  private async _showAddRepositoryDialog() {
    showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.apps.repositories.add_title"),
      inputLabel: this.hass.localize("ui.panel.config.apps.repositories.url"),
      inputType: "url",
      confirmText: this.hass.localize("ui.panel.config.apps.repositories.add"),
      action: async (url) => {
        try {
          await addStoreRepository(this.hass, url!);
          await this._loadData();
          fireEvent(this, "apps-collection-refresh", { collection: "store" });
        } catch (err: any) {
          showAlertDialog(this, {
            text: extractApiErrorMessage(err),
          });
          throw err;
        }
      },
    });
  }

  private _removeRepository = async (ev: Event) => {
    const slug = (ev.currentTarget as any).slug;
    const repo = this._repositories?.find((r) => r.slug === slug);

    showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.apps.repositories.remove"),
      text: this.hass.localize(
        "ui.panel.config.apps.repositories.confirm_remove",
        { name: repo?.name || slug }
      ),
      destructive: true,
      confirmText: this.hass.localize(
        "ui.panel.config.apps.repositories.remove"
      ),
      action: async () => {
        try {
          await removeStoreRepository(this.hass, slug);
          await this._loadData();
          fireEvent(this, "apps-collection-refresh", { collection: "store" });
        } catch (err: any) {
          showAlertDialog(this, {
            text: extractApiErrorMessage(err),
          });
          throw err;
        }
      },
    });
  };

  private async _loadData(): Promise<void> {
    try {
      const [repositories, addon] = await Promise.all([
        fetchStoreRepositories(this.hass),
        fetchHassioAddonsInfo(this.hass),
      ]);
      this._repositories = repositories;
      this._addon = addon;
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
    }
  }

  static styles: CSSResultGroup = css`
    ha-icon-button.delete {
      color: var(--error-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-repositories": HaConfigAppsRepositories;
  }
}
