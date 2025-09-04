import { mdiDotsVertical } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { navigate } from "../../../src/common/navigate";
import { extractSearchParam } from "../../../src/common/url/search-params";
import "../../../src/components/ha-md-button-menu";
import "../../../src/components/ha-md-menu-item";
import "../../../src/components/ha-icon-button";
import "../../../src/components/search-input";
import type { HassioAddonRepository } from "../../../src/data/hassio/addon";
import { reloadHassioAddons } from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import type { StoreAddon } from "../../../src/data/supervisor/store";
import type { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-subpage";
import type { HomeAssistant, Route } from "../../../src/types";
import { showRegistriesDialog } from "../dialogs/registries/show-dialog-registries";
import { showRepositoriesDialog } from "../dialogs/repositories/show-dialog-repositories";
import "./hassio-addon-repository";

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

@customElement("hassio-addon-store")
export class HassioAddonStore extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter?: string;

  public async refreshData(_ev) {
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

    if (this.supervisor.store.repositories) {
      repos = this.addonRepositories(
        this.supervisor.store.repositories,
        this.supervisor.store.addons,
        this._filter
      );
    }

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .header=${this.supervisor.localize("panel.store")}
      >
        <ha-md-button-menu positioning="popover" slot="toolbar-icon">
          <ha-icon-button
            .label=${this.supervisor.localize("common.menu")}
            .path=${mdiDotsVertical}
            slot="trigger"
          ></ha-icon-button>
          <ha-md-menu-item @click=${this.refreshData}>
            ${this.supervisor.localize("store.check_updates")}
          </ha-md-menu-item>
          <ha-md-menu-item @click=${this._manageRepositoriesClicked}>
            ${this.supervisor.localize("store.repositories")}
          </ha-md-menu-item>
          ${this.hass.userData?.showAdvanced &&
          atLeastVersion(this.hass.config.version, 0, 117)
            ? html`<ha-md-menu-item @click=${this._manageRegistries}>
                ${this.supervisor.localize("store.registries")}
              </ha-md-menu-item>`
            : ""}
        </ha-md-button-menu>
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
                  ${this.supervisor.localize("store.missing_addons")}
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
    navigate("/hassio/store", { replace: true });
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
              <hassio-addon-repository
                .hass=${this.hass}
                .repo=${repo}
                .addons=${filteredAddons}
                .filter=${filter!}
                .supervisor=${this.supervisor}
              ></hassio-addon-repository>
            `
          : nothing;
      })
  );

  private _apiCalled(ev) {
    if (ev.detail.success) {
      this._loadData();
    }
  }

  private _manageRepositoriesClicked(_ev) {
    this._manageRepositories();
  }

  private _manageRepositories(url?: string) {
    showRepositoriesDialog(this, {
      supervisor: this.supervisor,
      url,
    });
  }

  private _manageRegistries(_ev) {
    showRegistriesDialog(this, { supervisor: this.supervisor });
  }

  private _loadData() {
    fireEvent(this, "supervisor-collection-refresh", { collection: "addon" });
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "supervisor",
    });
  }

  private _filterChanged(e) {
    this._filter = e.detail.value;
  }

  static styles = css`
    hassio-addon-repository {
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
    "hassio-addon-store": HassioAddonStore;
  }
}
