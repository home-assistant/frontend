import "@material/mwc-tab";
import "@material/mwc-tab-bar";
import { mdiDotsVertical } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-menu-button";
import "../../components/ha-button-menu";
import "../../components/ha-check-list-item";
import { LovelaceConfig } from "../../data/lovelace";
import "../../layouts/ha-app-layout";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "../lovelace/components/hui-energy-period-selector";
import { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import { getEnergyDataCollection } from "../../data/energy";

const LOVELACE_CONFIG: LovelaceConfig = {
  views: [
    {
      strategy: {
        type: "energy",
      },
    },
  ],
};

@customElement("ha-panel-energy")
class PanelEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _compare? = false;

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._compare = getEnergyDataCollection(this.hass, {
        key: "energy_dashboard",
      }).compare;
    }
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass?.locale !== this.hass.locale) {
      this._setLovelace();
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("narrow") &&
      changedProps.get("narrow") !== undefined
    ) {
      this._reloadView();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.energy")}</div>
            ${this.narrow
              ? ""
              : html`
                  <hui-energy-period-selector
                    .hass=${this.hass}
                    collectionKey="energy_dashboard"
                  ></hui-energy-period-selector>
                `}
            <ha-button-menu
              corner="BOTTOM_START"
              @action=${this._toggleCompare}
            >
              <ha-icon-button
                .label=${this.hass.localize("panel.menu")}
                .path=${mdiDotsVertical}
                slot="trigger"
              ></ha-icon-button>
              <ha-check-list-item left .selected=${this._compare}>
                Compare with previous period
              </ha-check-list-item>
            </ha-button-menu>
          </app-toolbar>
        </app-header>
        <hui-view
          .hass=${this.hass}
          .narrow=${this.narrow}
          .lovelace=${this._lovelace}
          .index=${this._viewIndex}
          @reload-energy-panel=${this._reloadView}
          @energy-compare-stopped=${this._compareStopped}
        ></hui-view>
      </ha-app-layout>
    `;
  }

  private _setLovelace() {
    this._lovelace = {
      config: LOVELACE_CONFIG,
      rawConfig: LOVELACE_CONFIG,
      editMode: false,
      urlPath: "energy",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
    };
  }

  private _reloadView() {
    // Force strategy to be re-run by make a copy of the view
    const config = this._lovelace!.config;
    this._lovelace = {
      ...this._lovelace!,
      config: { ...config, views: [{ ...config.views[0] }] },
    };
  }

  private _compareStopped() {
    this._compare = false;
  }

  private _toggleCompare() {
    this._compare = !this._compare;
    const energyCollection = getEnergyDataCollection(this.hass, {
      key: "energy_dashboard",
    });
    energyCollection.setCompare(this._compare);
    energyCollection.refresh();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        app-toolbar {
          display: flex;
          justify-content: space-between;
        }
        hui-energy-period-selector {
          width: 100%;
          padding-left: 16px;
          --disabled-text-color: rgba(var(--rgb-text-primary-color), 0.5);
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
