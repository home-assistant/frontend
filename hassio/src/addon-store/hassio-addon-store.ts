import "./hassio-addon-repository";
import "./hassio-repositories-editor";
import { TemplateResult, html } from "lit-html";
import {
  LitElement,
  CSSResult,
  css,
  property,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../../src/types";
import {
  HassioAddonRepository,
  HassioAddonInfo,
  fetchHassioAddonsInfo,
  reloadHassioAddons,
} from "../../../src/data/hassio/addon";
import "../../../src/layouts/loading-screen";
import "../components/hassio-search-input";

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
  @property() public hass!: HomeAssistant;
  @property() private _addons?: HassioAddonInfo[];
  @property() private _repos?: HassioAddonRepository[];
  @property() private _filter?: string;

  public async refreshData() {
    this._repos = undefined;
    this._addons = undefined;
    this._filter = undefined;
    await reloadHassioAddons(this.hass);
    await this._loadData();
  }

  protected render(): TemplateResult {
    if (!this._addons || !this._repos) {
      return html`
        <loading-screen></loading-screen>
      `;
    }
    const repos: TemplateResult[] = [];

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
          .filter=${this._filter}
        ></hassio-addon-repository>
      `);
    }

    return html`
      <hassio-repositories-editor
        .hass=${this.hass}
        .repos=${this._repos}
      ></hassio-repositories-editor>

      <hassio-search-input
        .filter=${this._filter}
        @value-changed=${this._filterChanged}
      ></hassio-search-input>

      ${repos}
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
    `;
  }
}

customElements.define("hassio-addon-store", HassioAddonStore);
