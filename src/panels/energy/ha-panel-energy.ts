import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-tab";
import "@material/mwc-tab-bar";
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
import "../../layouts/ha-app-layout";
import { mdiCog, mdiLightningBolt } from "@mdi/js";
import { haStyle } from "../../resources/styles";
import "../lovelace/views/hui-view";
import { HomeAssistant } from "../../types";
import { Lovelace } from "../lovelace/types";
import { showEnergySettingsDialog } from "./dialogs/show-dialog-energy-settings";

const VIEW_CONFIGS = [
  {
    views: [
      {
        strategy: {
          type: "energy",
        },
      },
    ],
  },
  {
    views: [
      {
        strategy: {
          type: "energy-details",
        },
      },
    ],
  },
];

@customElement("ha-panel-energy")
class PanelEnergy extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @state() private _curTabIndex = 0;

  @state() private _lovelace?: Lovelace;

  public willUpdate(changedProps: PropertyValues) {
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass?.locale !== this.hass.locale) {
      this._setLovelace();
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
            <mwc-tab-bar
              .activeIndex=${this._curTabIndex}
              @MDCTabBar:activated=${this._handleTabActivated}
            >
              <mwc-tab
                .hasImageIcon=${this.narrow}
                .label=${this.narrow ? undefined : "Overview"}
              >
                ${this.narrow
                  ? html`<ha-svg-icon
                      slot="icon"
                      .path=${mdiLightningBolt}
                    ></ha-svg-icon>`
                  : ""}
              </mwc-tab>
              <mwc-tab
                .hasImageIcon=${this.narrow}
                .label=${this.narrow ? undefined : "Details"}
              >
                ${this.narrow
                  ? html`<ha-svg-icon
                      slot="icon"
                      .path=${mdiLightningBolt}
                    ></ha-svg-icon>`
                  : ""}
              </mwc-tab>
            </mwc-tab-bar>
            <mwc-icon-button @click=${this._showSettings}
              ><ha-svg-icon .path=${mdiCog}></ha-svg-icon
            ></mwc-icon-button>
          </app-toolbar>
        </app-header>
        <hui-view
          .hass=${this.hass}
          .narrow=${this.narrow}
          .lovelace=${this._lovelace}
          .index=${0}
          @reload-energy-panel=${this._reloadView}
        ></hui-view>
      </ha-app-layout>
    `;
  }

  private _setLovelace() {
    this._lovelace = {
      config: VIEW_CONFIGS[this._curTabIndex],
      rawConfig: VIEW_CONFIGS[this._curTabIndex],
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

  private async _handleTabActivated(ev: CustomEvent): Promise<void> {
    if (this._curTabIndex === ev.detail.index) {
      return;
    }
    this._curTabIndex = ev.detail.index;
    this._setLovelace();
  }

  private _reloadView() {
    // Force strategy to be re-run by make a copy of the view
    const config = this._lovelace!.config;
    this._lovelace = {
      ...this._lovelace!,
      config: { ...config, views: [{ ...config.views[0] }] },
    };
  }

  private _showSettings() {
    showEnergySettingsDialog(this, {
      savedCallback: () => this._reloadView(),
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host([narrow]) mwc-tab {
          width: 48px;
          overflow: hidden;
        }
        mwc-tab {
          --mdc-theme-primary: var(--text-primary-color);
          --mdc-tab-text-label-color-default: var(--light-primary-color);
          --mdc-tab-color-default: var(--light-primary-color);
          --mdc-tab-height: var(--header-height);
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
