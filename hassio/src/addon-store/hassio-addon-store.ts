import "@material/mwc-icon-button/mwc-icon-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical } from "@mdi/js";
import {
  css,
  CSSResult,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { atLeastVersion } from "../../../src/common/config/version";
import "../../../src/common/search/search-input";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-svg-icon";
import {
  fetchHassioAddonsInfo,
  HassioAddonInfo,
  HassioAddonRepository,
  reloadHassioAddons,
} from "../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
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

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) private _addons?: HassioAddonInfo[];

  @property({ attribute: false }) private _repos?: HassioAddonRepository[];

  @internalProperty() private _filter?: string;

  public async refreshData() {
    this._repos = undefined;
    this._addons = undefined;
    this._filter = undefined;
    await reloadHassioAddons(this.hass);
    await this._loadData();
  }

  protected render(): TemplateResult {
    const repos: TemplateResult[] = [];

    if (this._repos) {
      for (const repo of this._repos) {
        const addons = this._addons!.filter(
          (addon) => addon.repository === repo.slug
        );

        if (addons.length === 0) {
          continue;
        }

        repos.push(html`
          <hassio-addon-repository
            .hass=${this.hass}
            .repo=${repo}
            .addons=${addons}
            .filter=${this._filter!}
          ></hassio-addon-repository>
        `);
      }
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        hassio
        main-page
        .tabs=${supervisorTabs}
      >
        <span slot="header">Add-on Store</span>
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            Repositories
          </mwc-list-item>
          <mwc-list-item>
            Reload
          </mwc-list-item>
          ${this.hass.userData?.showAdvanced &&
          atLeastVersion(this.hass.config.version, 0, 117)
            ? html`<mwc-list-item>
                Registries
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
                Missing add-ons? Enable advanced mode on
                <a href="/profile" target="_top">
                  your profile page
                </a>
                .
              </div>
            `
          : ""}
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
    this._loadData();
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._manageRepositories();
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

  private async _manageRepositories() {
    showRepositoriesDialog(this, {
      repos: this._repos!,
      loadData: () => this._loadData(),
    });
  }

  private async _manageRegistries() {
    showRegistriesDialog(this);
  }

  private async _loadData() {
    try {
      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._repos = addonsInfo.repositories;
      this._repos.sort(sortRepos);
      this._addons = addonsInfo.addons;
    } catch (err) {
      alert(extractApiErrorMessage(err));
    }
  }

  private async _filterChanged(e) {
    this._filter = e.detail.value;
  }

  static get styles(): CSSResult {
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
