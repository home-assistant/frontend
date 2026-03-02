import { mdiDelete, mdiDeleteOff, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/data-table/ha-data-table";
import type { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type {
  HassioAddonInfo,
  HassioAddonsInfo,
  HassioAddonRepository,
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
import "../../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../types";

interface RepositoryRowData {
  slug: string;
  name: string;
  maintainer: string;
  url: string;
}

@customElement("ha-config-apps-repositories")
export class HaConfigAppsRepositories extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _repositories?: HassioAddonRepository[];

  @state() private _addon?: HassioAddonsInfo;

  @state() private _error?: string;

  protected firstUpdated() {
    this._loadData().then(() => {
      const repositoryUrl = extractSearchParam("repository_url");
      if (repositoryUrl) {
        this._addRepository(repositoryUrl);
      }
    });
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
        label: localize("ui.panel.config.apps.dialog.repositories.remove"),
        type: "icon-button",
        showNarrow: true,
        lastFixed: true,
        template: (row) => {
          const used = usedRepositories.includes(row.slug);
          return html`
            <ha-tooltip .for="delete-btn-${row.slug}">
              ${localize(
                used
                  ? "ui.panel.config.apps.dialog.repositories.used"
                  : "ui.panel.config.apps.dialog.repositories.remove"
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
    (repos: HassioAddonRepository[]): RepositoryRowData[] =>
      repos.map((repo) => ({
        slug: repo.slug,
        name: repo.name,
        maintainer: repo.maintainer,
        url: repo.url,
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

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/apps/available"
        .header=${this.hass.localize("ui.panel.config.apps.store.repositories")}
      >
        <ha-data-table
          .hass=${this.hass}
          .columns=${this._columns(this.hass.localize, usedRepositories)}
          .data=${this._data(repositories)}
          .noDataText=${this.hass.localize(
            "ui.panel.config.apps.dialog.repositories.no_repositories"
          )}
          id="slug"
          has-fab
        ></ha-data-table>
        <ha-fab
          .label=${this.hass.localize(
            "ui.panel.config.apps.dialog.repositories.add"
          )}
          extended
          @click=${this._showAddRepositoryDialog}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-fab>
      </hass-subpage>
    `;
  }

  private async _showAddRepositoryDialog() {
    const url = await showPromptDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.apps.dialog.repositories.title"
      ),
      inputLabel: this.hass.localize(
        "ui.panel.config.apps.dialog.repositories.add"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.apps.dialog.repositories.add"
      ),
    });

    if (!url) {
      return;
    }

    await this._addRepository(url);
  }

  private async _addRepository(url: string) {
    try {
      await addStoreRepository(this.hass, url);
      await this._loadData();
      fireEvent(this, "apps-collection-refresh", { collection: "store" });
    } catch (err: any) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _removeRepository(ev: Event) {
    const slug = (ev.currentTarget as any).slug;
    try {
      await removeStoreRepository(this.hass, slug);
      await this._loadData();
      fireEvent(this, "apps-collection-refresh", { collection: "store" });
    } catch (err: any) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    }
  }

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
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
    ha-data-table {
      width: 100%;
      height: 100%;
      --data-table-border-width: 0;
    }
    ha-icon-button.delete {
      color: var(--error-color);
    }
    ha-fab {
      position: fixed;
      right: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom));
      inset-inline-end: calc(var(--ha-space-4) + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-apps-repositories": HaConfigAppsRepositories;
  }
}
