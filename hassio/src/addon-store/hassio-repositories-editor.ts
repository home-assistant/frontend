import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-input/paper-input";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { repeat } from "lit-html/directives/repeat";
import memoizeOne from "memoize-one";
import "../../../src/components/buttons/ha-call-api-button";
import { HassioAddonRepository } from "../../../src/data/hassio/addon";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-repositories-editor")
class HassioRepositoriesEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public repos!: HassioAddonRepository[];

  @property() private _repoUrl = "";

  private _sortedRepos = memoizeOne((repos: HassioAddonRepository[]) =>
    repos
      .filter((repo) => repo.slug !== "core" && repo.slug !== "local")
      .sort((a, b) => (a.name < b.name ? -1 : 1))
  );

  protected render(): TemplateResult {
    const repos = this._sortedRepos(this.repos);
    return html`
      <div class="content">
        <h1>
          Repositories
        </h1>
        <p class="description">
          Configure which add-on repositories to fetch data from:
        </p>
        <div class="card-group">
          ${// Use repeat so that the fade-out from call-service-api-button
          // stays with the correct repo after we add/delete one.
          repeat(
            repos,
            (repo) => repo.slug,
            (repo) => html`
              <paper-card>
                <div class="card-content">
                  <hassio-card-content
                    .hass=${this.hass}
                    .title=${repo.name}
                    .description=${repo.url}
                    icon="hassio:github-circle"
                  ></hassio-card-content>
                </div>
                <div class="card-actions">
                  <ha-call-api-button
                    path="hassio/supervisor/options"
                    .hass=${this.hass}
                    .data=${this.computeRemoveRepoData(repos, repo.url)}
                    class="warning"
                  >
                    Remove
                  </ha-call-api-button>
                </div>
              </paper-card>
            `
          )}

          <paper-card>
            <div class="card-content add">
              <iron-icon icon="hassio:github-circle"></iron-icon>
              <paper-input
                label="Add new repository by URL"
                .value=${this._repoUrl}
                @value-changed=${this._urlChanged}
              ></paper-input>
            </div>
            <div class="card-actions">
              <ha-call-api-button
                path="hassio/supervisor/options"
                .hass=${this.hass}
                .data=${this.computeAddRepoData(repos, this._repoUrl)}
              >
                Add
              </ha-call-api-button>
            </div>
          </paper-card>
        </div>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("repos")) {
      this._repoUrl = "";
    }
  }

  private _urlChanged(ev: PolymerChangedEvent<string>) {
    this._repoUrl = ev.detail.value;
  }

  private computeRemoveRepoData(repoList, url) {
    const list = repoList
      .filter((repo) => repo.url !== url)
      .map((repo) => repo.source);
    return { addons_repositories: list };
  }

  private computeAddRepoData(repoList, url) {
    const list = repoList ? repoList.map((repo) => repo.source) : [];
    list.push(url);
    return { addons_repositories: list };
  }

  static get styles(): CSSResultArray {
    return [
      hassioStyle,
      css`
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
          margin-top: -4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-repositories-editor": HassioRepositoriesEditor;
  }
}
