import {
  css,
  CSSResult,
  LitElement,
  property,
  PropertyValues,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import {
  fetchHassioAddonsInfo,
  HassioAddonInfo,
  HassioAddonRepository,
  reloadHassioAddons,
} from "../../../src/data/hassio/addon";
import "../../../src/layouts/loading-screen";
import "../../../src/layouts/hass-tabs-subpage";
import { HomeAssistant, Route } from "../../../src/types";
import "../../../src/common/search/search-input";
import "./hassio-addon-repository";
import "./hassio-repositories-editor";

import { supervisorTabs } from "../hassio-panel";

import { showRepositoriesDialog } from "./show-dialog-repositories";

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

  @property() private _filter?: string;

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
        <span slot="header">Add-on store</span>
        <paper-menu-button
          close-on-activate
          no-animations
          horizontal-align="right"
          horizontal-offset="-5"
          slot="toolbar-icon"
        >
          <paper-icon-button
            icon="hassio:dots-vertical"
            slot="dropdown-trigger"
            alt="menu"
          ></paper-icon-button>
          <paper-listbox slot="dropdown-content" role="listbox">
            <paper-item @tap=${this._manageRepositories}>
              Repositories
            </paper-item>
            <paper-item @tap=${this.refreshData}>
              Reload
            </paper-item>
          </paper-listbox>
        </paper-menu-button>

        ${repos.length === 0
          ? html`<loading-screen></loading-screen>`
          : html`
              <div class="search">
                <search-input
                  hassio
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
                <p>
                  Missing add-ons? Enable advanced mode on
                  <a href="/profile">your profile page</a>.
                </p>
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

  private apiCalled(ev) {
    if (ev.detail.success) {
      this._loadData();
    }
  }

  private async _manageRepositories() {
    showRepositoriesDialog(this);
  }

  private async _loadData() {
    try {
      const addonsInfo = await fetchHassioAddonsInfo(this.hass);
      this._repos = addonsInfo.repositories;
      this._repos.sort(sortRepos);
      this._addons = addonsInfo.addons;
    } catch (err) {
      alert("Failed to fetch add-on info");
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
      }
    `;
  }
}

customElements.define("hassio-addon-store", HassioAddonStore);
