import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import { mdiDotsVertical } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { extractSearchParam } from "../../../common/url/search-params";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/search-input";
import type {
  HassioAddonsInfo,
  HassioAddonRepository,
} from "../../../data/hassio/addon";
import {
  fetchHassioAddonsInfo,
  reloadHassioAddons,
} from "../../../data/hassio/addon";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type {
  StoreAddon,
  SupervisorStore,
} from "../../../data/supervisor/store";
import { fetchSupervisorStore } from "../../../data/supervisor/store";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-loading-screen";
import "../../../layouts/hass-subpage";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { HomeAssistant, Route } from "../../../types";
import { showRepositoriesDialog } from "./dialogs/repositories/show-dialog-repositories";
import { showRegistriesDialog } from "./dialogs/registries/show-dialog-registries";
import "./supervisor-apps-repository";

const sortRepos = (a: HassioAddonRepository, b: HassioAddonRepository) => {
  if (a.slug === "local") {
    return -1;
  }
  if (b.slug === "local") {
    return 1;
  }
  if (a.slug === "core") {
    return -1;
  }
  if (b.slug === "core") {
    return 1;
  }
  return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1;
};

@customElement("ha-config-apps-available")
export class HaConfigAppsAvailable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _store?: SupervisorStore;

  @state() private _addon?: HassioAddonsInfo;

  @state() private _error?: string;

  @state() private _filter?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "apps-collection-refresh",
      this._handleCollectionRefresh as unknown as EventListener
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "apps-collection-refresh",
      this._handleCollectionRefresh as unknown as EventListener
    );
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    const repositoryUrl = extractSearchParam("repository_url");
    navigate("/config/apps/available", { replace: true });
    this._loadData().then(() => {
      if (repositoryUrl) {
        this._manageRepositories(repositoryUrl);
      }
    });

    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
  }

  protected render() {
    if (this._error) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this._error}
        ></hass-error-screen>
      `;
    }

    if (!this._store || !this._addon) {
      return html`
        <hass-loading-screen
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></hass-loading-screen>
      `;
    }

    let repos: (TemplateResult | typeof nothing)[] = [];

    if (this._store.repositories) {
      repos = this._addonRepositories(
        this._store.repositories,
        this._store.addons,
        this._filter
      );
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        back-path="/config/apps"
        .header=${this.hass.localize("ui.panel.config.apps.store.title")}
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleAction}>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <ha-list-item>
            ${this.hass.localize("ui.panel.config.apps.store.check_updates")}
          </ha-list-item>
          <ha-list-item>
            ${this.hass.localize("ui.panel.config.apps.store.repositories")}
          </ha-list-item>
          ${this.hass.userData?.showAdvanced
            ? html`<ha-list-item>
                ${this.hass.localize("ui.panel.config.apps.store.registries")}
              </ha-list-item>`
            : ""}
        </ha-button-menu>
        ${repos.length === 0
          ? html`<hass-loading-screen no-toolbar></hass-loading-screen>`
          : html`
              <div class="search">
                <search-input
                  .hass=${this.hass}
                  .filter=${this._filter}
                  @value-changed=${this._filterChanged}
                ></search-input>
              </div>

              ${repos}
            `}
        ${!this.hass.userData?.showAdvanced
          ? html`
              <div class="advanced">
                <a href="/profile" target="_top">
                  ${this.hass.localize(
                    "ui.panel.config.apps.store.missing_apps"
                  )}
                </a>
              </div>
            `
          : ""}
      </hass-subpage>
    `;
  }

  private _addonRepositories = memoizeOne(
    (
      repositories: HassioAddonRepository[],
      addons: StoreAddon[],
      filter?: string
    ) =>
      repositories.sort(sortRepos).map((repo) => {
        const filteredAddons = addons.filter(
          (addon) => addon.repository === repo.slug
        );

        return filteredAddons.length !== 0
          ? html`
              <supervisor-apps-repository
                .hass=${this.hass}
                .repo=${repo}
                .addons=${filteredAddons}
                .filter=${filter!}
              ></supervisor-apps-repository>
            `
          : nothing;
      })
  );

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._refreshData();
        break;
      case 1:
        this._manageRepositoriesClicked();
        break;
      case 2:
        this._manageRegistries();
        break;
    }
  }

  private async _refreshData() {
    try {
      await reloadHassioAddons(this.hass);
    } catch (err) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._loadData();
    }
  }

  private _apiCalled(ev) {
    if (ev.detail.success) {
      this._loadData();
    }
  }

  private _manageRepositoriesClicked() {
    this._manageRepositories();
  }

  private _manageRepositories(url?: string) {
    showRepositoriesDialog(this, {
      addon: this._addon!,
      url,
      closeCallback: () => this._loadData(),
    });
  }

  private _manageRegistries() {
    showRegistriesDialog(this);
  }

  private async _loadData(): Promise<void> {
    try {
      const [addon, store] = await Promise.all([
        fetchHassioAddonsInfo(this.hass),
        fetchSupervisorStore(this.hass),
      ]);

      this._addon = addon;
      this._store = store;
    } catch (err: any) {
      this._error =
        err.message || this.hass.localize("ui.panel.config.apps.error_loading");
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.apps.error_loading"),
        text: this._error,
      });
    }
  }

  private _handleCollectionRefresh = async (
    ev: HASSDomEvent<{ collection: "addon" | "store" }>
  ): Promise<void> => {
    const { collection } = ev.detail;
    try {
      if (collection === "addon") {
        this._addon = await fetchHassioAddonsInfo(this.hass);
      } else if (collection === "store") {
        this._store = await fetchSupervisorStore(this.hass);
      }
    } catch (_err: any) {
      // Silently fail on refresh errors
    }
  };

  private _filterChanged(e) {
    this._filter = e.detail.value;
  }

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background-color: var(--primary-background-color);
    }
    supervisor-apps-repository {
      margin-top: 24px;
    }
    .search {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    search-input {
      display: block;
      --mdc-text-field-fill-color: var(--sidebar-background-color);
      --mdc-text-field-idle-line-color: var(--divider-color);
    }
    .advanced {
      padding: 12px;
      display: flex;
      flex-wrap: wrap;
      color: var(--primary-text-color);
    }
    .advanced a {
      margin-left: 0.5em;
      margin-inline-start: 0.5em;
      margin-inline-end: initial;
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HASSDomEvents {
    "apps-collection-refresh": { collection: "addon" | "store" };
  }
  interface HTMLElementTagNameMap {
    "ha-config-apps-available": HaConfigAppsAvailable;
  }
}
