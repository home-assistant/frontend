import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { createCloseHeading } from "../../../components/ha-dialog";
import "../../../components/search-input";
import type { LovelaceRawConfig } from "../../../data/lovelace/config/types";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { NewDashboardDialogParams } from "./show-dialog-new-dashboard";
import "./dashboard-card";
import type { LocalizeKeys } from "../../../common/translations/localize";

const EMPTY_CONFIG: LovelaceRawConfig = { views: [{ title: "Home" }] };

interface Strategy {
  type: string;
  images: { dark: string; light: string };
  name: string;
  description: string;
}

const STRATEGIES = [
  {
    type: "default",
    images: {
      light:
        "/static/images/dashboard-options/light/icon-dashboard-default.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-default.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.default.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.default.description",
  },
  {
    type: "areas",
    images: {
      light: "/static/images/dashboard-options/light/icon-dashboard-areas.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-areas.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.areas.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.areas.description",
  },
  {
    type: "overview",
    images: {
      light: "/static/images/dashboard-options/light/icon-dashboard-areas.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-areas.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.overview.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.overview.description",
  },
  {
    type: "map",
    images: {
      light: "/static/images/dashboard-options/light/icon-dashboard-map.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-map.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.map.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.map.description",
  },
  {
    type: "iframe",
    images: {
      light:
        "/static/images/dashboard-options/light/icon-dashboard-webpage.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-webpage.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.iframe.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.iframe.description",
  },
] as const satisfies Strategy[];

@customElement("ha-dialog-new-dashboard")
class DialogNewDashboard extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _params?: NewDashboardDialogParams;

  @state() private _filter = "";

  @state() private _localizedStrategies: (Strategy & {
    localizedName: string;
    localizedDescription: string;
  })[] = [];

  public showDialog(params: NewDashboardDialogParams): void {
    this._opened = true;
    this._params = params;
    this._localizedStrategies = STRATEGIES.map((strategy) => ({
      ...strategy,
      localizedName: this.hass.localize(strategy.name as LocalizeKeys),
      localizedDescription: this.hass.localize(
        strategy.description as LocalizeKeys
      ),
    }));
  }

  public closeDialog() {
    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._params = undefined;
    return true;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.panel.config.lovelace.dashboards.dialog_new.header`
          )
        )}
      >
        <search-input
          .hass=${this.hass}
          .label=${this.hass.localize(
            `ui.panel.config.lovelace.dashboards.dialog_new.search_dashboards`
          )}
          .filter=${this._filter}
          @value-changed=${this._handleSearchChange}
        ></search-input>
        <div class="content">
          ${this._filter
            ? html`
                <div class="cards-container">
                  ${this._filterStrategies(
                    this._localizedStrategies,
                    this._filter
                  ).map(
                    (strategy) => html`
                      <dashboard-card
                        .name=${strategy.localizedName}
                        .description=${strategy.localizedDescription}
                        .img=${this.hass.themes.darkMode
                          ? strategy.images.dark
                          : strategy.images.light}
                        .alt=${strategy.localizedName}
                        @click=${this._selected}
                        .strategy=${strategy.type}
                      ></dashboard-card>
                    `
                  )}
                </div>
              `
            : html`
                <div class="cards-container">
                  <dashboard-card
                    .name=${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.dialog_new.create_empty`
                    )}
                    .description=${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.dialog_new.create_empty_description`
                    )}
                    .img=${this.hass.themes.darkMode
                      ? "/static/images/dashboard-options/dark/icon-dashboard-new.svg"
                      : "/static/images/dashboard-options/light/icon-dashboard-new.svg"}
                    .alt=${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.dialog_new.create_empty`
                    )}
                    @click=${this._selected}
                    .config=${EMPTY_CONFIG}
                  ></dashboard-card>
                </div>
                <div class="cards-container">
                  <div class="cards-container-header">
                    ${this.hass.localize(
                      `ui.panel.config.lovelace.dashboards.dialog_new.heading.default`
                    )}
                  </div>
                  ${this._localizedStrategies.map(
                    (strategy) => html`
                      <dashboard-card
                        .name=${strategy.localizedName}
                        .description=${strategy.localizedDescription}
                        .img=${this.hass.themes.darkMode
                          ? strategy.images.dark
                          : strategy.images.light}
                        .alt=${strategy.localizedName}
                        @click=${this._selected}
                        .strategy=${strategy.type}
                      ></dashboard-card>
                    `
                  )}
                </div>
              `}
        </div>
      </ha-dialog>
    `;
  }

  private _handleSearchChange(ev: CustomEvent) {
    this._filter = ev.detail.value;
  }

  private _filterStrategies = memoizeOne(
    (
      strategies: (Strategy & {
        localizedName: string;
        localizedDescription: string;
      })[],
      filter?: string
    ): readonly (Strategy & {
      localizedName: string;
      localizedDescription: string;
    })[] => {
      if (!filter) {
        return strategies;
      }
      const options: IFuseOptions<(typeof strategies)[0]> = {
        keys: ["type", "localizedName", "localizedDescription"],
        isCaseSensitive: false,
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: Math.min(filter.length, 2),
      };
      const fuse = new Fuse(strategies, options);
      return fuse.search(filter).map((result) => result.item);
    }
  );

  private _generateStrategyConfig(strategy: string) {
    return {
      strategy: {
        type: strategy,
      },
    };
  }

  private async _selected(ev: Event) {
    const target = ev.currentTarget as any;
    let config: any = null;

    if (target.config) {
      config = target.config;
    } else if (target.strategy) {
      if (target.strategy === "default") {
        config = null;
      } else {
        config = this._generateStrategyConfig(target.strategy);
      }
    }

    this._params?.selectConfig(config);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* overrule the ha-style-dialog max-height on small screens */
          ha-dialog {
            --mdc-dialog-max-height: 100%;
            height: 100%;
          }
        }

        @media all and (min-width: 850px) {
          ha-dialog {
            --mdc-dialog-min-width: 845px;
            --mdc-dialog-min-height: calc(100vh - 72px);
            --mdc-dialog-max-height: calc(100vh - 72px);
          }
        }

        ha-dialog {
          --mdc-dialog-max-width: 845px;
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
        }
        .cards-container-header {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: 12px 8px;
          margin: 0;
          grid-column: 1 / -1;
          position: sticky;
          top: 56px;
          z-index: 1;
          background: linear-gradient(
            90deg,
            var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff))
              0%,
            #ffffff00 80%
          );
        }
        search-input {
          display: block;
          --mdc-shape-small: var(--card-picker-search-shape);
          margin: var(--card-picker-search-margin);
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: var(
            --ha-dialog-surface-background,
            var(--mdc-theme-surface, #fff)
          );
        }
        .cards-container {
          display: grid;
          grid-gap: 8px 8px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          margin-top: 20px;
        }
        .content {
          padding: 0 24px 0 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-new-dashboard": DialogNewDashboard;
  }
}
