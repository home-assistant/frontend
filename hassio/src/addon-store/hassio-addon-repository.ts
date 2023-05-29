import { mdiArrowUpBoldCircle, mdiPuzzle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../src/common/config/version";
import { navigate } from "../../../src/common/navigate";
import { caseInsensitiveStringCompare } from "../../../src/common/string/compare";
import "../../../src/components/ha-card";
import { HassioAddonRepository } from "../../../src/data/hassio/addon";
import { StoreAddon } from "../../../src/data/supervisor/store";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { HomeAssistant } from "../../../src/types";
import "../components/hassio-card-content";
import { filterAndSort } from "../components/hassio-filter-addons";
import { hassioStyle } from "../resources/hassio-style";

@customElement("hassio-addon-repository")
export class HassioAddonRepositoryEl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @property({ attribute: false }) public repo!: HassioAddonRepository;

  @property({ attribute: false }) public addons!: StoreAddon[];

  @property() public filter!: string;

  private _getAddons = memoizeOne((addons: StoreAddon[], filter?: string) => {
    if (filter) {
      return filterAndSort(addons, filter);
    }
    return addons.sort((a, b) =>
      caseInsensitiveStringCompare(a.name, b.name, this.hass.locale.language)
    );
  });

  protected render(): TemplateResult {
    const repo = this.repo;
    let _addons = this.addons;
    if (!this.hass.userData?.showAdvanced) {
      _addons = _addons.filter(
        (addon) => !addon.advanced && addon.stage === "stable"
      );
    }
    const addons = this._getAddons(_addons, this.filter);

    if (this.filter && addons.length < 1) {
      return html`
        <div class="content">
          <p class="description">
            ${this.supervisor.localize(
              "store.no_results_found",
              "repository",
              repo.name
            )}
          </p>
        </div>
      `;
    }
    return html`
      <div class="content">
        <h1>${repo.name}</h1>
        <div class="card-group">
          ${addons.map(
            (addon) => html`
              <ha-card
                outlined
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
                        ? this.supervisor.localize(
                            "common.new_version_available"
                          )
                        : this.supervisor.localize("addon.state.installed")
                      : addon.available
                      ? this.supervisor.localize("addon.state.not_installed")
                      : this.supervisor.localize("addon.state.not_available")}
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
    navigate(`/hassio/addon/${ev.currentTarget.addon.slug}?store=true`);
  }

  static get styles(): CSSResultGroup {
    return [
      hassioStyle,
      css`
        ha-card {
          cursor: pointer;
          overflow: hidden;
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
