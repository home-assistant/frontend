import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/buttons/ha-call-api-button";
import "../components/hassio-card-content";
import "../resources/hassio-style";

class HassioRepositoriesEditor extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-style hassio-style">
        .add {
          padding: 12px 16px;
        }
        iron-icon {
          color: var(--secondary-text-color);
          margin-right: 16px;
          display: inline-block;
        }
        paper-input {
          width: calc(100% - 49px);
          display: inline-block;
        }
      </style>
      <div class="card-group">
        <div class="title">
          Repositories
          <div class="description">
            Configure which add-on repositories to fetch data from:
          </div>
        </div>
        <template
          id="list"
          is="dom-repeat"
          items="[[repoList]]"
          as="repo"
          sort="sortRepos"
        >
          <paper-card>
            <div class="card-content">
              <hassio-card-content
                hass="[[hass]]"
                title="[[repo.name]]"
                description="[[repo.url]]"
                icon="hassio:github-circle"
              ></hassio-card-content>
            </div>
            <div class="card-actions">
              <ha-call-api-button
                hass="[[hass]]"
                path="hassio/supervisor/options"
                data="[[computeRemoveRepoData(repoList, repo.url)]]"
                class="warning"
                >Remove</ha-call-api-button
              >
            </div>
          </paper-card>
        </template>
        <paper-card>
          <div class="card-content add">
            <iron-icon icon="hassio:github-circle"></iron-icon>
            <paper-input
              label="Add new repository by URL"
              value="{{repoUrl}}"
            ></paper-input>
          </div>
          <div class="card-actions">
            <ha-call-api-button
              hass="[[hass]]"
              path="hassio/supervisor/options"
              data="[[computeAddRepoData(repoList, repoUrl)]]"
              >Add</ha-call-api-button
            >
          </div>
        </paper-card>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      repos: {
        type: Array,
        observer: "reposChanged",
      },
      repoList: Array,
      repoUrl: String,
    };
  }

  reposChanged(repos) {
    this.repoList = repos.filter(
      (repo) => repo.slug !== "core" && repo.slug !== "local"
    );
    this.repoUrl = "";
  }

  sortRepos(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  computeRemoveRepoData(repoList, url) {
    const list = repoList
      .filter((repo) => repo.url !== url)
      .map((repo) => repo.url);
    return { addons_repositories: list };
  }

  computeAddRepoData(repoList, url) {
    const list = repoList ? repoList.map((repo) => repo.url) : [];
    list.push(url);
    return { addons_repositories: list };
  }
}

customElements.define("hassio-repositories-editor", HassioRepositoriesEditor);
