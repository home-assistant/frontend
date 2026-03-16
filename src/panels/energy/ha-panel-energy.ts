import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { navigate } from "../../common/navigate";
import "../../components/ha-alert";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import type { LovelaceConfig } from "../../data/lovelace/config/types";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant, PanelInfo } from "../../types";
import { generateLovelaceDashboardStrategy } from "../lovelace/strategies/get-strategy";
import "../lovelace/hui-root";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-container";

export {
  DEFAULT_ENERGY_COLLECTION_KEY,
  DEFAULT_POWER_COLLECTION_KEY,
} from "./constants";

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

  private async _loadConfig() {
    try {
      this._error = undefined;
      await this._setLovelace();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load energy config:", err);
      this._error = (err as Error).message || "Unknown error";
      return;
    }

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
    const config: LovelaceConfig = await generateLovelaceDashboardStrategy(
      { strategy: { type: "energy" } },
      this.hass
    );

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
            ${this.hass.localize("ui.panel.energy.error_loading_preferences", {
              error: this._error,
            })}
          </ha-alert>
        </div>
      `;
    }

    if (!this._lovelace) {
      return html`
        <div class="centered">
          <ha-spinner size="large"></ha-spinner>
        </div>
      `;
    }

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
      >
      </hui-root>
    `;
  }

  private _navigateConfig(ev?: Event) {
    ev?.stopPropagation();
    const viewPath = this.route?.path?.split("/")[1] || "";
    const tabMap: Record<string, string> = {
      overview: "electricity",
      electricity: "electricity",
      gas: "gas",
      water: "water",
      now: "electricity",
    };
    const tab = tabMap[viewPath] || "electricity";
    navigate(`/config/energy/${tab}?historyBack=1`);
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
