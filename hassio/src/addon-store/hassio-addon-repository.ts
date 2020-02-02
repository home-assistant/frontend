import {
  css,
  TemplateResult,
  html,
  LitElement,
  property,
  CSSResultArray,
} from "lit-element";
import "@polymer/paper-card/paper-card";
import memoizeOne from "memoize-one";

import "../components/hassio-card-content";
import { hassioStyle } from "../resources/hassio-style";
import { HomeAssistant } from "../../../src/types";
import {
  HassioAddonInfo,
  HassioAddonRepository,
} from "../../../src/data/hassio/addon";
import { navigate } from "../../../src/common/navigate";
import { filterAndSort } from "../components/hassio-filter-addons";

class HassioAddonRepositoryEl extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public repo!: HassioAddonRepository;
  @property() public addons!: HassioAddonInfo[];
  @property() public filter!: string;

  private _getAddons = memoizeOne(
    (addons: HassioAddonInfo[], filter?: string) => {
      if (filter) {
        return filterAndSort(addons, filter);
      }
      return addons.sort((a, b) =>
        a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1
      );
    }
  );

  protected render(): TemplateResult {
    const repo = this.repo;
    const addons = this._getAddons(this.addons, this.filter);
    const HA105plus = this._computeHA105plus;

    if (this.filter && addons.length < 1) {
      return html`
        <div class="content">
          <p class="description">
            No results found in "${repo.name}"
          </p>
        </div>
      `;
    }
    return html`
      <div class="content">
        <h1>
          ${repo.name}
        </h1>
        <p class="description">
          Maintained by ${repo.maintainer}<br />
          <a class="repo" href=${repo.url} target="_blank">${repo.url}</a>
        </p>
        <div class="card-group">
          ${addons.map(
            (addon) => html`
              <paper-card
                .addon=${addon}
                class=${addon.available ? "" : "not_available"}
                @click=${this._addonTapped}
              >
                <div class="card-content">
                  <hassio-card-content
                    .hass=${this.hass}
                    .title=${addon.name}
                    .description=${addon.description}
                    .available=${addon.available}
                    icon=${addon.installed !== addon.version
                      ? "hassio:arrow-up-bold-circle"
                      : "hassio:puzzle"}
                    .iconTitle=${addon.installed
                      ? addon.installed !== addon.version
                        ? "New version available"
                        : "Add-on is installed"
                      : addon.available
                      ? "Add-on is not installed"
                      : "Add-on is not available on your system"}
                    .iconClass=${addon.installed
                      ? addon.installed !== addon.version
                        ? "update"
                        : "installed"
                      : !addon.available
                      ? "not_available"
                      : ""}
                    .iconImage=${HA105plus && addon.icon
                      ? `/api/hassio/addons/${addon.slug}/icon`
                      : undefined}
                    ?showBlueTopbar=${addon.installed}
                  ></hassio-card-content>
                </div>
              </paper-card>
            `
          )}
        </div>
      </div>
    `;
  }

  private _addonTapped(ev) {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  private get _computeHA105plus(): boolean {
    const [major, minor] = this.hass.config.version.split(".", 2);
    return Number(major) > 0 || (major === "0" && Number(minor) >= 105);
  }

  static get styles(): CSSResultArray {
    return [
      hassioStyle,
      css`
        paper-card {
          cursor: pointer;
        }
        .not_available {
          opacity: 0.6;
        }
        a.repo {
          color: var(--primary-text-color);
        }
      `,
    ];
  }
}

customElements.define("hassio-addon-repository", HassioAddonRepositoryEl);
