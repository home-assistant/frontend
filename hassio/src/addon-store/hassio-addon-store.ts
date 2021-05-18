import "@material/mwc-icon-button/mwc-icon-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { fireEvent } from "../../../src/common/dom/fire_event";
import { navigate } from "../../../src/common/navigate";
import "../../../src/common/search/search-input";
import { extractSearchParam } from "../../../src/common/url/search-params";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-svg-icon";
import {
  HassioAddonInfo,
  HassioAddonRepository,
  reloadHassioAddons,
} from "../../../src/data/hassio/addon";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import "../../../src/layouts/hass-loading-screen";
import "../../../src/layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../src/types";
import { showRegistriesDialog } from "../dialogs/registries/show-dialog-registries";
import { showRepositoriesDialog } from "../dialogs/repositories/show-dialog-repositories";
import { supervisorTabs } from "../hassio-tabs";
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

class HassioAddonStore extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _filter?: string;

  public async refreshData() {
    await reloadHassioAddons(this.hass);
    await this._loadData();
  }

  protected render(): TemplateResult {
    let repos: TemplateResult[] = [];

    if (this.supervisor.addon.repositories) {
      repos = this.addonRepositories(
        this.supervisor.addon.repositories,
        this.supervisor.addon.addons,
        this._filter
      );
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .localizeFunc=${this.supervisor.localize}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${supervisorTabs}
        main-page
        supervisor
      >
        <span slot="header"> ${this.supervisor.localize("panel.store")} </span>
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            ${this.supervisor.localize("store.repositories")}
          </mwc-list-item>
          <mwc-list-item>
            ${this.supervisor.localize("common.reload")}
          </mwc-list-item>
          ${this.hass.userData?.showAdvanced &&
          atLeastVersion(this.hass.config.version, 0, 117)
            ? html`<mwc-list-item>
                ${this.supervisor.localize("store.registries")}
              </mwc-list-item>`
            : ""}
        </ha-button-menu>
        ${repos.length === 0
          ? html`<hass-loading-screen no-toolbar></hass-loading-screen>`
          : html`
              <div class="search">
                <search-input
                  no-label-float
                  no-underline
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
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    const repositoryUrl = extractSearchParam("repository_url");
    navigate("/hassio/store", { replace: true });
    if (repositoryUrl) {
      this._manageRepositories(repositoryUrl);
    }

    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
    this._loadData();
  }

  private addonRepositories = memoizeOne(
    (
      repositories: HassioAddonRepository[],
      addons: HassioAddonInfo[],
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
          : html``;
      })
  );

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._manageRepositoriesClicked();
        break;
      case 1:
        this.refreshData();
        break;
      case 2:
        this._manageRegistries();
        break;
    }
  }

  private apiCalled(ev) {
    if (ev.detail.success) {
      this._loadData();
    }
  }

  private _manageRepositoriesClicked() {
    this._manageRepositories();
  }

  private async _manageRepositories(url?: string) {
    showRepositoriesDialog(this, {
      supervisor: this.supervisor,
      url,
    });
  }

  private async _manageRegistries() {
    showRegistriesDialog(this, { supervisor: this.supervisor });
  }

  private async _loadData() {
    fireEvent(this, "supervisor-collection-refresh", { collection: "addon" });
    fireEvent(this, "supervisor-collection-refresh", {
      collection: "supervisor",
    });
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  static get styles(): CSSResultGroup {
    return css`
      hassio-addon-repository {
        margin-top: 24px;
      }
      .search {
        padding: 0 16px;
        background: var(--sidebar-background-color);
        border-bottom: 1px solid var(--divider-color);
      }
      .search search-input {
        position: relative;
        top: 2px;
      }
      .advanced {
        padding: 12px;
        display: flex;
        flex-wrap: wrap;
        color: var(--primary-text-color);
      }
      .advanced a {
        margin-left: 0.5em;
        color: var(--primary-color);
      }
    `;
  }
}

customElements.define("hassio-addon-store", HassioAddonStore);
