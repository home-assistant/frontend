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

  protected render(): TemplateResult | void {
    const repo = this.repo;
    const addons = this._getAddons(this.addons, this.filter);

    if (this.filter && addons.length < 1) {
      return html`
        <div class="card-group">
          <div class="title">
            <div class="description">
              No results found in "${repo.name}"
            </div>
          </div>
        </div>
      `;
    }
    return html`
      <div class="card-group">
        <div class="title">
          ${repo.name}
          <div class="description">
            Maintained by ${repo.maintainer}<br />
            <a class="repo" href=${repo.url} target="_blank">${repo.url}</a>
          </div>
        </div>

        ${addons.map(
          (addon) => html`
            <paper-card
              .addon=${addon}
              class=${addon.available ? "" : "not_available"}
              @click=${this.addonTapped}
            >
              <div class="card-content">
                <hassio-card-content
                  .hass=${this.hass}
                  .title=${addon.name}
                  .description=${addon.description}
                  .available=${addon.available}
                  .icon=${this.computeIcon(addon)}
                  .iconTitle=${this.computeIconTitle(addon)}
                  .iconClass=${this.computeIconClass(addon)}
                ></hassio-card-content>
              </div>
            </paper-card>
          `
        )}
      </div>
    `;
  }

  private computeIcon(addon) {
    return addon.installed && addon.installed !== addon.version
      ? "hassio:arrow-up-bold-circle"
      : "hassio:puzzle";
  }

  private computeIconTitle(addon) {
    if (addon.installed) {
      return addon.installed !== addon.version
        ? "New version available"
        : "Add-on is installed";
    }
    return addon.available
      ? "Add-on is not installed"
      : "Add-on is not available on your system";
  }

  private computeIconClass(addon) {
    if (addon.installed) {
      return addon.installed !== addon.version ? "update" : "installed";
    }
    return !addon.available ? "not_available" : "";
  }

  private addonTapped(ev) {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
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
