import { mdiBatteryAlert, mdiDotsVertical } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-top-app-bar-fixed";
import type { LovelaceStrategyViewConfig } from "../../data/lovelace/config/view";
import { ChildPanelReady } from "../../layouts/panel-ready";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-background";
import "../lovelace/views/hui-view-container";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import { showBatteryThresholdsDialog } from "./show-dialog-battery-thresholds";
import "../../components/ha-svg-icon";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  findEntities,
  generateEntityFilter,
} from "../../common/entity/entity_filter";
import { maintenanceEntityFilters } from "./strategies/maintenance-view-strategy";

const MAINTENANCE_LOVELACE_VIEW_CONFIG: LovelaceStrategyViewConfig = {
  strategy: {
    type: "maintenance",
  },
};

@customElement("ha-panel-maintenance")
class PanelMaintenance extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _searchParams = new URLSearchParams(window.location.search);

  private _childPanelReady?: ChildPanelReady;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this._setup();
      return;
    }

    if (!changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
      return;
    }

    if (oldHass && this.hass) {
      // If the entity registry changed, ask the user if they want to refresh the config
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors ||
        oldHass.panels !== this.hass.panels
      ) {
        if (this.hass.config.state === "RUNNING") {
          this._debounceRegistriesChanged();
          return;
        }
      }
      // If ha started, refresh the config
      if (
        this.hass.config.state === "RUNNING" &&
        oldHass.config.state !== "RUNNING"
      ) {
        this._setLovelace();
      }
    }
  }

  private async _setup() {
    await this.hass.loadFragmentTranslation("lovelace");
    this._setLovelace();
  }

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    this._setLovelace();
  };

  private _openThresholds = () => {
    if (!this.hass.user?.is_admin) {
      return;
    }
    const filters = maintenanceEntityFilters.map((f) =>
      generateEntityFilter(this.hass, f)
    );
    showBatteryThresholdsDialog(this, {
      // Same entities as the Maintenance view; only sensors have a percentage
      entityIds: findEntities(Object.keys(this.hass.states), filters).filter(
        (id) => computeDomain(id) === "sensor"
      ),
    });
  };

  protected render() {
    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${this._searchParams.has("historyBack")}
      >
        <div slot="title">${this.hass.localize("panel.maintenance")}</div>
        ${
          this.hass.user?.is_admin
            ? html`<ha-dropdown
                slot="actionItems"
                @wa-select=${this._openThresholds}
              >
                <ha-icon-button
                  slot="trigger"
                  .label=${this.hass.localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>
                <ha-dropdown-item>
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiBatteryAlert}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                "ui.panel.lovelace.strategy.maintenance.battery_thresholds"
              )}
                </ha-dropdown-item>
              </ha-dropdown> `
            : nothing
        }
        ${
          this._lovelace
            ? html`
                <hui-view-container .hass=${this.hass}>
                  <hui-view-background .hass=${this.hass}>
                  </hui-view-background>
                  <hui-view
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .lovelace=${this._lovelace}
                    .index=${this._viewIndex}
                  ></hui-view>
                </hui-view-container>
              `
            : nothing
        }
      </ha-top-app-bar-fixed>
    `;
  }

  private async _setLovelace() {
    const viewConfig = await generateLovelaceViewStrategy(
      MAINTENANCE_LOVELACE_VIEW_CONFIG,
      this.hass
    );

    const config = { views: [viewConfig] };
    const rawConfig = { views: [MAINTENANCE_LOVELACE_VIEW_CONFIG] };

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._childPanelReady ??= new ChildPanelReady(this);
    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "maintenance",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          user-select: none;
        }
        hui-view-container {
          position: relative;
          display: flex;
          box-sizing: border-box;
        }
        hui-view {
          flex: 1 1 100%;
          max-width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-maintenance": PanelMaintenance;
  }
}
