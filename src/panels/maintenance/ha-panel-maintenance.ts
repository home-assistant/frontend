import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { goBack } from "../../common/navigate";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-icon-button";
import "../../components/ha-menu-button";
import {
  fetchFrontendSystemData,
  saveFrontendSystemData,
  type MaintenanceFrontendSystemData,
} from "../../data/frontend";
import type { LovelaceStrategyViewConfig } from "../../data/lovelace/config/view";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-background";
import "../lovelace/views/hui-view-container";
import { showEditMaintenanceDialog } from "./dialogs/show-dialog-edit-maintenance";

@customElement("ha-panel-maintenance")
class PanelMaintenance extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _config: MaintenanceFrontendSystemData = {};

  @state() private _searchParms = new URLSearchParams(window.location.search);

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

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

      if (
        this.hass.config.state === "RUNNING" &&
        oldHass.config.state !== "RUNNING"
      ) {
        this._setup();
      }
    }
  }

  private async _setup() {
    await this.hass.loadFragmentTranslation("lovelace");

    try {
      this._config =
        (await fetchFrontendSystemData(this.hass.connection, "maintenance")) ||
        {};
    } catch (_err) {
      this._config = {};
    }

    this._setLovelace();
  }

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    this._setLovelace();
  };

  private _back(ev) {
    ev.stopPropagation();
    goBack();
  }

  protected render() {
    return html`
      <div class="header ${classMap({ narrow: this.narrow })}">
        <div class="toolbar">
          ${this._searchParms.has("historyBack")
            ? html`
                <ha-icon-button-arrow-prev
                  @click=${this._back}
                  slot="navigationIcon"
                ></ha-icon-button-arrow-prev>
              `
            : html`
                <ha-menu-button
                  slot="navigationIcon"
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                ></ha-menu-button>
              `}
          <div class="main-title">
            ${this.hass.localize("panel.maintenance")}
          </div>
          <ha-icon-button
            .label=${this.hass.localize("ui.panel.maintenance.editor.title")}
            .path=${mdiPencil}
            @click=${this._editMaintenance}
          ></ha-icon-button>
        </div>
      </div>
      ${this._lovelace
        ? html`
            <hui-view-container .hass=${this.hass}>
              <hui-view-background .hass=${this.hass}></hui-view-background>
              <hui-view
                .hass=${this.hass}
                .narrow=${this.narrow}
                .lovelace=${this._lovelace}
                .index=${this._viewIndex}
              ></hui-view>
            </hui-view-container>
          `
        : nothing}
    `;
  }

  private async _setLovelace() {
    const rawViewConfig: LovelaceStrategyViewConfig = {
      strategy: {
        type: "maintenance",
        battery_attention_threshold: this._config.battery_attention_threshold,
      },
    };

    const viewConfig = await generateLovelaceViewStrategy(
      rawViewConfig,
      this.hass
    );

    const config = { views: [viewConfig] };
    const rawConfig = { views: [rawViewConfig] };

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config,
      rawConfig,
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

  private _editMaintenance = () => {
    showEditMaintenanceDialog(this, {
      config: this._config,
      saveConfig: async (config) => {
        await this._saveConfig(config);
      },
    });
  };

  private async _saveConfig(
    config: MaintenanceFrontendSystemData
  ): Promise<void> {
    try {
      await saveFrontendSystemData(this.hass.connection, "maintenance", config);
      this._config = config;
    } catch (_err) {
      showToast(this, {
        message: this.hass.localize("ui.panel.maintenance.editor.save_failed"),
        duration: 0,
        dismissable: true,
      });
      return;
    }

    showToast(this, {
      message: this.hass.localize("ui.common.successfully_saved"),
    });
    this._setLovelace();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }

        .header {
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          position: fixed;
          top: 0;
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-right,
                0px
              )
          );
          padding-top: var(--safe-area-inset-top);
          z-index: 4;
          display: flex;
          flex-direction: row;
          -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
          backdrop-filter: var(--app-header-backdrop-filter, none);
          padding-right: var(--safe-area-inset-right);
        }

        :host([narrow]) .header {
          width: calc(
            var(--mdc-top-app-bar-width, 100%) - var(
                --safe-area-inset-left,
                0px
              ) - var(--safe-area-inset-right, 0px)
          );
          padding-left: var(--safe-area-inset-left);
        }

        :host([scrolled]) .header {
          box-shadow: var(
            --mdc-top-app-bar-fixed-box-shadow,
            0px 2px 4px -1px rgba(0, 0, 0, 0.2),
            0px 4px 5px 0px rgba(0, 0, 0, 0.14),
            0px 1px 10px 0px rgba(0, 0, 0, 0.12)
          );
        }

        .toolbar {
          height: var(--header-height);
          display: flex;
          flex: 1;
          align-items: center;
          font-size: var(--ha-font-size-xl);
          padding: 0 12px;
          font-weight: var(--ha-font-weight-normal);
          box-sizing: border-box;
          border-bottom: var(--app-header-border-bottom, none);
        }

        :host([narrow]) .toolbar {
          padding: 0 4px;
        }

        .main-title {
          margin-inline-start: var(--ha-space-6);
          line-height: var(--ha-line-height-normal);
          flex-grow: 1;
        }

        .narrow .main-title {
          margin-inline-start: var(--ha-space-2);
        }

        hui-view-container {
          position: relative;
          display: flex;
          min-height: 100vh;
          box-sizing: border-box;
          padding-top: calc(var(--header-height) + var(--safe-area-inset-top));
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
