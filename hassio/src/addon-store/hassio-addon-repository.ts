import { mdiArrowUpBoldCircle, mdiPuzzle } from "@mdi/js";
import {
  css,
  CSSResultArray,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { navigate } from "../../../src/common/navigate";
import "../../../src/components/ha-card";
import {
  HassioAddonInfo,
  HassioAddonRepository,
} from "../../../src/data/hassio/addon";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { filterAndSort } from "../components/hassio-filter-addons";
import { hassioStyle } from "../resources/hassio-style";

class HassioAddonRepositoryEl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public repo!: HassioAddonRepository;

  @property({ attribute: false }) public addons!: HassioAddonInfo[];

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
    let _addons = this.addons;
    if (!this.hass.userData?.showAdvanced) {
      _addons = _addons.filter((addon) => {
        return !addon.advanced;
      });
    }
    const addons = this._getAddons(_addons, this.filter);

    if (this.filter && addons.length < 1) {
      return html`
        <div class="content">
          <p class="description">
            No results found in "${repo.name}."
          </p>
        </div>
      `;
    }
    return html`
      <div class="content">
        <h1>
          ${repo.name}
        </h1>
        <div class="card-group">
          ${addons.map(
            (addon) => html`
              <ha-card
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
                    .icon=${addon.installed && addon.update_available
                      ? mdiArrowUpBoldCircle
                      : mdiPuzzle}
                    .iconTitle=${addon.installed
                      ? addon.update_available
                        ? "New version available"
                        : "Add-on is installed"
                      : addon.available
                      ? "Add-on is not installed"
                      : "Add-on is not available on your system"}
                    .iconClass=${addon.installed
                      ? addon.update_available
                        ? "update"
                        : "installed"
                      : !addon.available
                      ? "not_available"
                      : ""}
                    .iconImage=${atLeastVersion(
                      this.hass.config.version,
                      0,
                      105
                    ) && addon.icon
                      ? `/api/hassio/addons/${addon.slug}/icon`
                      : undefined}
                    .showTopbar=${addon.installed || !addon.available}
                    .topbarClass=${addon.installed
                      ? addon.update_available
                        ? "update"
                        : "installed"
                      : !addon.available
                      ? "unavailable"
                      : ""}
                  ></hassio-card-content>
                </div>
              </ha-card>
            `
          )}
        </div>
      </div>
    `;
  }

  private _addonTapped(ev) {
    navigate(this, `/hassio/addon/${ev.currentTarget.addon.slug}`);
  }

  static get styles(): CSSResultArray {
    return [
      hassioStyle,
      css`
        ha-card {
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
