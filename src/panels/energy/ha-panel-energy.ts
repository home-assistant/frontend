import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { navigate } from "../../common/navigate";
import type { LocalizeKeys } from "../../common/translations/localize";
import "../../components/ha-alert";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import type { EnergyPreferences } from "../../data/energy";
import { getEnergyDataCollection } from "../../data/energy";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import {
  isStrategyView,
  type LovelaceViewConfig,
} from "../../data/lovelace/config/view";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, PanelInfo } from "../../types";
import "../lovelace/components/hui-energy-period-selector";
import "../lovelace/hui-root";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-container";

export const DEFAULT_ENERGY_COLLECTION_KEY = "energy_dashboard";
export const DEFAULT_POWER_COLLECTION_KEY = "energy_dashboard_now";

const EMPTY_PREFERENCES: EnergyPreferences = {
  energy_sources: [],
  device_consumption: [],
  device_consumption_water: [],
};

const OVERVIEW_VIEW = {
  path: "overview",
  strategy: {
    type: "energy-overview",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const ENERGY_VIEW = {
  path: "electricity",
  strategy: {
    type: "energy",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const WATER_VIEW = {
  path: "water",
  strategy: {
    type: "water",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const GAS_VIEW = {
  path: "gas",
  strategy: {
    type: "gas",
    collection_key: DEFAULT_ENERGY_COLLECTION_KEY,
    show_period_selector: true,
  },
} as LovelaceViewConfig;

const POWER_VIEW = {
  path: "now",
  strategy: {
    type: "power",
    collection_key: DEFAULT_POWER_COLLECTION_KEY,
  },
} as LovelaceViewConfig;

const WIZARD_VIEW = {
  type: "panel",
  path: "setup",
  cards: [{ type: "custom:energy-setup-wizard-card" }],
};

@customElement("ha-panel-energy")
class PanelEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  @property({ attribute: false }) public route?: {
    path: string;
    prefix: string;
  };

  @state()
  private _prefs?: EnergyPreferences;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state()
  private _error?: string;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._loadConfig();
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (this._lovelace && oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
    }
  }

  private _fetchEnergyPrefs = async (): Promise<
    EnergyPreferences | undefined
  > => {
    const collection = getEnergyDataCollection(this.hass, {
      key: DEFAULT_ENERGY_COLLECTION_KEY,
    });
    try {
      await collection.refresh();
    } catch (err: any) {
      if (err.code === "not_found") {
        return undefined;
      }
      throw err;
    }
    return collection.prefs;
  };

  private async _loadConfig() {
    try {
      this._error = undefined;
      const prefs = await this._fetchEnergyPrefs();
      this._prefs = prefs || EMPTY_PREFERENCES;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load prefs:", err);
      this._prefs = EMPTY_PREFERENCES;
      this._error = (err as Error).message || "Unknown error";
    }
    await this._setLovelace();

    // Check if current path is valid, navigate to first view if not
    const views = this._lovelace!.config?.views || [];
    const validPaths = views.map((view) => view.path);
    const viewPath: string | undefined = this.route!.path.split("/")[1];
    if (!viewPath || !validPaths.includes(viewPath)) {
      navigate(`${this.route!.prefix}/${validPaths[0]}`, { replace: true });
    } else {
      // Force hui-root to re-process the route by creating a new route object
      this.route = { ...this.route! };
    }
  }

  private async _setLovelace() {
    const config = await this._generateLovelaceConfig();

    this._lovelace = {
      config: config,
      rawConfig: config,
      editMode: false,
      urlPath: "energy",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => this._navigateConfig(),
      showToast: () => undefined,
    };
  }

  protected render() {
    if (this._error) {
      return html`
        <div class="centered">
          <ha-alert alert-type="error">
            An error occurred loading energy preferences: ${this._error}
          </ha-alert>
        </div>
      `;
    }

    if (!this._prefs) {
      // Still loading
      return html`
        <div class="centered">
          <ha-spinner size="large"></ha-spinner>
        </div>
      `;
    }

    if (!this._lovelace) {
      return nothing;
    }

    const routePath = this.route?.path?.split("/")[1] || "";
    const currentView = this._lovelace.config.views.find(
      (view) => view.path === routePath
    );

    const showEnergySelector =
      currentView &&
      isStrategyView(currentView) &&
      currentView.strategy?.show_period_selector;

    return html`
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        .backButton=${this._searchParms.has("historyBack")}
        .backPath=${this._searchParms.get("backPath") || "/"}
        @reload-energy-panel=${this._reloadConfig}
        class=${classMap({ "has-period-selector": showEnergySelector })}
      >
      </hui-root>
      ${showEnergySelector
        ? html`
            <ha-card class="period-selector">
              <hui-energy-period-selector
                .hass=${this.hass}
                .collectionKey=${DEFAULT_ENERGY_COLLECTION_KEY}
                opening-direction="right"
                vertical-opening-direction="up"
                fixed
              ></hui-energy-period-selector>
            </ha-card>
          `
        : nothing}
    `;
  }

  private async _generateLovelaceConfig(): Promise<LovelaceConfig> {
    if (
      !this._prefs ||
      (this._prefs.device_consumption.length === 0 &&
        this._prefs.energy_sources.length === 0)
    ) {
      await import("./cards/energy-setup-wizard-card");
      return {
        views: [WIZARD_VIEW],
      };
    }

    const hasEnergy = this._prefs.energy_sources.some((source) =>
      ["grid", "solar", "battery"].includes(source.type)
    );

    const hasPowerSource = this._prefs.energy_sources.some((source) => {
      if (source.type === "solar" && source.stat_rate) return true;
      if (source.type === "battery" && source.stat_rate) return true;
      if (source.type === "grid") {
        return !!source.stat_rate || !!source.power_config;
      }
      return false;
    });

    const hasDevicePower = this._prefs.device_consumption.some(
      (device) => device.stat_rate
    );

    const hasPower = hasPowerSource || hasDevicePower;

    const hasWater =
      this._prefs.energy_sources.some((source) => source.type === "water") ||
      this._prefs.device_consumption_water?.length > 0;

    const hasGas = this._prefs.energy_sources.some(
      (source) => source.type === "gas"
    );

    const hasDeviceConsumption = this._prefs.device_consumption.length > 0;

    const views: LovelaceViewConfig[] = [];
    if (hasEnergy || hasDeviceConsumption) {
      views.push(ENERGY_VIEW);
    }
    if (hasGas) {
      views.push(GAS_VIEW);
    }
    if (hasWater) {
      views.push(WATER_VIEW);
    }
    if (hasPower) {
      views.push(POWER_VIEW);
    }
    if (
      hasPowerSource ||
      [hasEnergy, hasGas, hasWater].filter(Boolean).length > 1
    ) {
      views.unshift(OVERVIEW_VIEW);
    }
    return {
      views: views.map((view) => ({
        ...view,
        title:
          view.title ||
          this.hass.localize(
            `ui.panel.energy.title.${view.path}` as LocalizeKeys
          ),
      })),
    };
  }

  private _navigateConfig(ev?: Event) {
    ev?.stopPropagation();
    navigate("/config/energy?historyBack=1");
  }

  private _reloadConfig() {
    this._loadConfig();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          --ha-view-sections-column-max-width: 100%;
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .centered {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        hui-root.has-period-selector {
          --view-container-padding-bottom: var(--ha-space-18);
        }
        .period-selector {
          position: fixed;
          z-index: 4;
          bottom: max(var(--ha-space-4), var(--safe-area-inset-bottom, 0px));
          left: max(
            var(--mdc-drawer-width, 0px),
            var(--safe-area-inset-left, 0px)
          );
          right: var(--safe-area-inset-right, 0);
          inset-inline-start: max(
            var(--mdc-drawer-width, 0px),
            var(--safe-area-inset-left, 0px)
          );
          inset-inline-end: var(--safe-area-inset-right, 0);
          transition:
            left var(--ha-animation-duration-normal) ease,
            right var(--ha-animation-duration-normal) ease,
            inset-inline-start var(--ha-animation-duration-normal) ease,
            inset-inline-end var(--ha-animation-duration-normal) ease;
          margin: 0 auto;
          max-width: calc(min(470px, 100% - var(--ha-space-4)));
          box-sizing: border-box;
          padding-left: var(--ha-space-2);
          padding-right: 0;
          padding-inline-start: var(--ha-space-4);
          padding-inline-end: 0;
          --ha-card-box-shadow:
            0px 3px 5px -1px rgba(0, 0, 0, 0.2),
            0px 6px 10px 0px rgba(0, 0, 0, 0.14),
            0px 1px 18px 0px rgba(0, 0, 0, 0.12);
          --ha-card-border-color: var(--divider-color);
          --ha-card-border-width: var(--ha-card-border-width, 1px);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          hui-root.has-period-selector {
            --view-container-padding-bottom: var(--ha-space-14);
          }
          .period-selector {
            bottom: max(var(--ha-space-2), var(--safe-area-inset-bottom, 0px));
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-energy": PanelEnergy;
  }
}

declare global {
  interface HASSDomEvents {
    "reload-energy-panel": undefined;
  }
}
