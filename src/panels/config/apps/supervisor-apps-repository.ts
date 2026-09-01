import {
  mdiAlertDecagramOutline,
  mdiArrowUpBoldCircle,
  mdiFlask,
  mdiPuzzle,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { navigate } from "../../../common/navigate";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-card";
import type { HassioAddonRepository } from "../../../data/hassio/addon";
import { addonImageUrl } from "../../../data/hassio/addon";
import type { StoreAddon } from "../../../data/supervisor/store";
import type { HomeAssistant } from "../../../types";
import "./components/supervisor-apps-card-content";
import type { AppTag } from "./components/supervisor-apps-card-content";
import { filterAndSort } from "./components/supervisor-apps-filter";
import { supervisorAppsStyle } from "./resources/supervisor-apps-style";

@customElement("supervisor-apps-repository")
export class SupervisorAppsRepositoryEl extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
    const addons = this._getAddons(this.addons, this.filter);

    if (this.filter && addons.length < 1) {
      return html`
        <div class="content">
          <p class="description">
            ${this.hass.localize(
              "ui.panel.config.apps.store.no_results_found",
              {
                repository: repo.name,
              }
            )}
          </p>
        </div>
      `;
    }
    return html`
      <div class="content">
        <h1>${repo.name}</h1>
        <div class="card-group">
          ${addons.map((addon) => {
            const tags = this._getAppTags(addon);
            return html`
              <ha-card
                outlined
                .addon=${addon}
                class=${addon.available ? "" : "not_available"}
                @click=${this._addonTapped}
              >
                <div class="card-content">
                  <supervisor-apps-card-content
                    .hass=${this.hass}
                    .title=${addon.name}
                    .stage=${addon.stage}
                    .description=${addon.description}
                    .available=${addon.available}
                    .installed=${addon.installed}
                    .updateAvailable=${
                      addon.installed && addon.update_available
                    }
                    .tags=${tags}
                    .icon=${
                      addon.installed && addon.update_available
                        ? mdiArrowUpBoldCircle
                        : mdiPuzzle
                    }
                    .iconTitle=${
                      addon.installed
                        ? addon.update_available
                          ? this.hass.localize(
                              "ui.panel.config.apps.state.update_available"
                            )
                          : this.hass.localize(
                              "ui.panel.config.apps.state.installed"
                            )
                        : addon.available
                          ? this.hass.localize(
                              "ui.panel.config.apps.state.not_installed"
                            )
                          : this.hass.localize(
                              "ui.panel.config.apps.state.not_available"
                            )
                    }
                    .iconImage=${
                      addon.icon
                        ? addonImageUrl(addon.slug, this.hass.auth.data.hassUrl)
                        : undefined
                    }
                  ></supervisor-apps-card-content>
                </div>
              </ha-card>
            `;
          })}
        </div>
      </div>
    `;
  }

  private _addonTapped(ev) {
    navigate(`/config/app/${ev.currentTarget.addon.slug}/info?store=true`);
  }

  private _getAppTags(addon: StoreAddon): AppTag[] {
    const labels: AppTag[] = [];

    if (addon.stage !== "stable") {
      labels.push({
        label: this.hass.localize(
          `ui.panel.config.apps.dashboard.capability.stages.${addon.stage}`
        ),
        variant: addon.stage === "experimental" ? "warning" : "danger",
        iconPath:
          addon.stage === "experimental" ? mdiFlask : mdiAlertDecagramOutline,
      });
    }

    return labels;
  }

  static get styles(): CSSResultGroup {
    return [
      supervisorAppsStyle,
      css`
        ha-card {
          cursor: pointer;
          overflow: hidden;
        }
        ha-card:hover {
          background-color: var(--ha-color-fill-neutral-quiet-resting);
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

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-apps-repository": SupervisorAppsRepositoryEl;
  }
}
