import type { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import { mdiDotsVertical } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../common/config/version";
import { fireEvent } from "../../common/dom/fire_event";
import { navigate } from "../../common/navigate";
import { extractSearchParam } from "../../common/url/search-params";
import "../../components/ha-button-menu";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/search-input";
import type {
  HassioAddonsInfo,
  HassioAddonRepository,
} from "../../data/hassio/addon";
import { reloadHassioAddons } from "../../data/hassio/addon";
import { extractApiErrorMessage } from "../../data/hassio/common";
import type { StoreAddon, SupervisorStore } from "../../data/supervisor/store";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import "../../layouts/hass-loading-screen";
import "../../layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../types";
import { showRepositoriesDialog } from "./dialogs/repositories/show-dialog-repositories";
import { showRegistriesDialog } from "./dialogs/registries/show-dialog-registries";
import "./apps-repository";

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

@customElement("apps-store")
export class AppsStore extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public store!: SupervisorStore;

  @property({ attribute: false }) public addon!: HassioAddonsInfo;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter?: string;

  public async refreshData() {
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

  protected render() {
    let repos: (TemplateResult | typeof nothing)[] = [];

    if (this.store.repositories) {
      repos = this.addonRepositories(
        this.store.repositories,
        this.store.addons,
        this._filter
      );
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .header=${this.hass.localize("ui.panel.apps.store.title")}
      >
        <ha-button-menu slot="toolbar-icon" @action=${this._handleAction}>
          <ha-icon-button
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <ha-list-item>
            ${this.hass.localize("ui.panel.apps.store.check_updates")}
          </ha-list-item>
          <ha-list-item>
            ${this.hass.localize("ui.panel.apps.store.repositories")}
          </ha-list-item>
          ${this.hass.userData?.showAdvanced &&
          atLeastVersion(this.hass.config.version, 0, 117)
            ? html`<ha-list-item>
                ${this.hass.localize("ui.panel.apps.store.registries")}
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
                  ${this.hass.localize("ui.panel.apps.store.missing_apps")}
                </a>
              </div>
            `
          : ""}
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    const repositoryUrl = extractSearchParam("repository_url");
    navigate("/apps", { replace: true });
    if (repositoryUrl) {
      this._manageRepositories(repositoryUrl);
    }

    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
    this._loadData();
  }

  private addonRepositories = memoizeOne(
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
              <apps-repository
                .hass=${this.hass}
                .repo=${repo}
                .addons=${filteredAddons}
                .filter=${filter!}
              ></apps-repository>
            `
          : nothing;
      })
  );

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this.refreshData();
        break;
      case 1:
        this._manageRepositoriesClicked();
        break;
      case 2:
        this._manageRegistries();
        break;
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
      addon: this.addon,
      url,
    });
  }

  private _manageRegistries() {
    showRegistriesDialog(this);
  }

  private _loadData() {
    fireEvent(this, "apps-collection-refresh", { collection: "addon" });
    fireEvent(this, "apps-collection-refresh", { collection: "store" });
  }

  private _filterChanged(e) {
    this._filter = e.detail.value;
  }

  static styles = css`
    apps-repository {
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
  interface HTMLElementTagNameMap {
    "apps-store": AppsStore;
  }
}
