import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import type { WindowWithPreloads } from "../../../data/preloads";
import type {
  LocalizeFunc,
  LocalizeKeys,
} from "../../../common/translations/localize";
import "../../../components/ha-dialog";
import "../../../components/input/ha-input-search";
import type { HaInputSearch } from "../../../components/input/ha-input-search";
import { CUSTOM_TYPE_PREFIX } from "../../../data/lovelace_custom_cards";
import {
  getCustomStrategiesForType,
  type CustomStrategyEntry,
} from "../../../data/lovelace_custom_strategies";
import { fetchResources } from "../../../data/lovelace/resource";
import type {
  LovelaceConfig,
  LovelaceDashboardStrategyConfig,
  LovelaceRawConfig,
} from "../../../data/lovelace/config/types";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleScrollbar } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { loadLovelaceResourcesAndWait } from "../../lovelace/common/load-resources";
import { generateDefaultView } from "../../lovelace/views/default-view";
import "./dashboard-card";
import type { NewDashboardDialogParams } from "./show-dialog-new-dashboard";

type DashboardCardSelectionTarget = EventTarget & {
  config?: LovelaceRawConfig;
  strategy?: string;
};

interface Strategy {
  type: string;
  images: { dark: string; light: string };
  name: string;
  description: string;
}

const STRATEGIES = [
  {
    type: "original-states",
    images: {
      light:
        "/static/images/dashboard-options/light/icon-dashboard-overview-legacy.svg",
      dark: "/static/images/dashboard-options/dark/icon-dashboard-overview-legacy.svg",
    },
    name: "ui.panel.config.lovelace.dashboards.dialog_new.strategy.overview-legacy.title",
    description:
      "ui.panel.config.lovelace.dashboards.dialog_new.strategy.overview-legacy.description",
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

  @state() private _open = false;

  @state() private _params?: NewDashboardDialogParams;

  @state() private _filter = "";

  @state() private _localizedStrategies: (Strategy & {
    localizedName: string;
    localizedDescription: string;
  })[] = [];

  @state() private _customStrategies: CustomStrategyEntry[] = [];

  public showDialog(params: NewDashboardDialogParams): void {
    this._open = true;
    this._params = params;
    this._localizedStrategies = STRATEGIES.map((strategy) => ({
      ...strategy,
      localizedName: this.hass.localize(strategy.name as LocalizeKeys),
      localizedDescription: this.hass.localize(
        strategy.description as LocalizeKeys
      ),
    }));
    this._customStrategies = getCustomStrategiesForType("dashboard");
    this._loadCustomStrategies();
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _generateDefaultConfig = memoizeOne(
    (localize: LocalizeFunc): LovelaceConfig => ({
      views: [generateDefaultView(localize, true)],
    })
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const defaultConfig = this._generateDefaultConfig(this.hass.localize);

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        flexcontent
        width="large"
        header-title=${this.hass.localize(
          `ui.panel.config.lovelace.dashboards.dialog_new.header`
        )}
        @closed=${this._dialogClosed}
      >
        <div class="content-wrapper">
          <ha-input-search
            appearance="outlined"
            autofocus
            .placeholder=${this.hass.localize(
              `ui.panel.config.lovelace.dashboards.dialog_new.search_dashboards`
            )}
            .value=${this._filter}
            @input=${this._handleSearchChange}
          ></ha-input-search>
          <div class="content ha-scrollbar">
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
                    ${this._filterCustomStrategies(
                      this._customStrategies,
                      this._filter
                    ).map(
                      (strategy) => html`
                        <dashboard-card
                          .name=${strategy.name || strategy.type}
                          .description=${strategy.description || ""}
                          .img=${this._customStrategyImage(strategy)}
                          .alt=${strategy.name || strategy.type}
                          @click=${this._selected}
                          .strategy=${CUSTOM_TYPE_PREFIX + strategy.type}
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
                      .config=${defaultConfig}
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
                  ${this._customStrategies.length > 0
                    ? html`
                        <div class="cards-container">
                          <div class="cards-container-header">
                            ${this.hass.localize(
                              `ui.panel.config.lovelace.dashboards.dialog_new.heading.custom`
                            )}
                          </div>
                          ${this._customStrategies.map(
                            (strategy) => html`
                              <dashboard-card
                                .name=${strategy.name || strategy.type}
                                .description=${strategy.description || ""}
                                .img=${this._customStrategyImage(strategy)}
                                .alt=${strategy.name || strategy.type}
                                @click=${this._selected}
                                .strategy=${CUSTOM_TYPE_PREFIX + strategy.type}
                              ></dashboard-card>
                            `
                          )}
                        </div>
                      `
                    : nothing}
                `}
          </div>
        </div>
      </ha-dialog>
    `;
  }

  private _handleSearchChange(ev: InputEvent) {
    this._filter = (ev.target as HaInputSearch).value ?? "";
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

  private _filterCustomStrategies = memoizeOne(
    (
      strategies: CustomStrategyEntry[],
      filter?: string
    ): readonly CustomStrategyEntry[] => {
      if (!filter) {
        return strategies;
      }
      const options: IFuseOptions<CustomStrategyEntry> = {
        keys: ["type", "name", "description"],
        isCaseSensitive: false,
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: Math.min(filter.length, 2),
      };
      const fuse = new Fuse(strategies, options);
      return fuse.search(filter).map((result) => result.item);
    }
  );

  private _generateStrategyConfig(
    strategy: string
  ): LovelaceDashboardStrategyConfig {
    return {
      strategy: {
        type: strategy,
      },
    };
  }

  private async _loadCustomStrategies(): Promise<void> {
    const preloadWindow = window as WindowWithPreloads;

    if (!preloadWindow.llResProm) {
      preloadWindow.llResProm = fetchResources(this.hass.connection);
    }

    try {
      const resources = await preloadWindow.llResProm;
      await loadLovelaceResourcesAndWait(resources, this.hass);
    } catch (_err: unknown) {
      preloadWindow.llResProm = undefined;
      this._customStrategies = getCustomStrategiesForType("dashboard");
      return;
    }

    this._customStrategies = getCustomStrategiesForType("dashboard");
  }

  private _customStrategyImage(
    strategy: CustomStrategyEntry
  ): string | undefined {
    const { images } = strategy;

    if (!images) {
      return undefined;
    }

    if (typeof images === "string") {
      return images;
    }

    return this.hass.themes.darkMode ? images.dark : images.light;
  }

  private async _selected(ev: Event) {
    const target = ev.currentTarget as DashboardCardSelectionTarget | null;
    let config: LovelaceRawConfig | undefined;

    if (!target) {
      return;
    }

    if (target.config) {
      config = target.config;
    } else if (target.strategy) {
      config = this._generateStrategyConfig(target.strategy);
    }

    await this._params?.selectConfig(config);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --dialog-z-index: 6;
          --ha-dialog-min-height: 60svh;
        }
        ha-dialog::part(body) {
          overflow: hidden;
          min-height: 0;
        }
        .cards-container-header {
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: var(--ha-space-3) var(--ha-space-2);
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
        ha-input-search {
          padding: 0 var(--ha-space-6);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .cards-container {
          display: grid;
          grid-gap: var(--ha-space-2) var(--ha-space-2);
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          margin-top: var(--ha-space-5);
        }
        .content-wrapper {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .content {
          padding: 0 var(--ha-space-6) var(--ha-space-6) var(--ha-space-6);
          flex: 1;
          min-height: 0;
          overflow: auto;
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
