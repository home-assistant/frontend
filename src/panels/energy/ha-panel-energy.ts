import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { mdiPencil } from "@mdi/js";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-menu-button";
import "../../components/ha-list-item";
import "../../components/ha-top-app-bar-fixed";
import { LovelaceConfig } from "../../data/lovelace/config/types";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import "../lovelace/components/hui-energy-period-selector";
import { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import { navigate } from "../../common/navigate";

const ENERGY_LOVELACE_CONFIG: LovelaceConfig = {
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

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  public willUpdate(changedProps: PropertyValues) {
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
    }
    if (!changedProps.has("hass")) {
      return;
    }
    const oldHass = changedProps.get("hass") as this["hass"];
    if (oldHass?.locale !== this.hass.locale) {
      this._setLovelace();
    }
    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._reloadView();
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="toolbar">
          <ha-menu-button
            slot="navigationIcon"
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></ha-menu-button>
          ${!this.narrow
            ? html`<div class="main-title">
                ${this.hass.localize("panel.energy")}
              </div>`
            : nothing}

          <hui-energy-period-selector
            .hass=${this.hass}
            collectionKey="energy_dashboard"
          >
            ${this.hass.user?.is_admin
              ? html`
                  <ha-list-item
                    slot="overflow-menu"
                    graphic="icon"
                    @request-selected=${this._navigateConfig}
                  >
                    <ha-svg-icon slot="graphic" .path=${mdiPencil}>
                    </ha-svg-icon>
                    ${this.hass!.localize("ui.panel.energy.configure")}
                  </ha-list-item>
                `
              : nothing}
          </hui-energy-period-selector>
        </div>
      </div>
      <hui-view
        id="view"
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .index=${this._viewIndex}
        @reload-energy-panel=${this._reloadView}
      ></hui-view>
    `;
  }

  private _setLovelace() {
    this._lovelace = {
      config: ENERGY_LOVELACE_CONFIG,
      rawConfig: ENERGY_LOVELACE_CONFIG,
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

  private _navigateConfig(ev) {
    ev.stopPropagation();
    navigate("/config/energy?historyBack=1");
  }

  private _reloadView() {
    // Force strategy to be re-run by make a copy of the view
    const config = this._lovelace!.config;
    this._lovelace = {
      ...this._lovelace!,
      config: { ...config, views: [{ ...config.views[0] }] },
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host hui-energy-period-selector {
          width: 100%;
          padding-left: 32px;
          padding-inline-start: 32px;
          padding-inline-end: initial;
          --disabled-text-color: rgba(var(--rgb-text-primary-color), 0.5);
          direction: var(--direction);
          --date-range-picker-max-height: calc(100vh - 80px);
        }
        :host([narrow]) hui-energy-period-selector {
          padding-left: 0px;
          padding-inline-start: 0px;
          padding-inline-end: initial;
        }
        :host {
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        .header {
          background-color: var(--app-header-background-color);
          color: var(--app-header-text-color, white);
          border-bottom: var(--app-header-border-bottom, none);
          position: fixed;
          top: 0;
          width: var(--mdc-top-app-bar-width, 100%);
          padding-top: env(safe-area-inset-top);
          z-index: 4;
          transition: box-shadow 200ms linear;
          display: flex;
          flex-direction: row;
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
          font-size: 20px;
          padding: 0px 12px;
          font-weight: 400;
          box-sizing: border-box;
        }
        @media (max-width: 599px) {
          .toolbar {
            padding: 0 4px;
          }
        }
        .main-title {
          margin: var(--margin-title);
          line-height: 20px;
          flex-grow: 1;
        }
        #view {
          position: relative;
          display: flex;
          padding-top: calc(var(--header-height) + env(safe-area-inset-top));
          min-height: 100vh;
          box-sizing: border-box;
          padding-left: env(safe-area-inset-left);
          padding-inline-start: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          padding-inline-end: env(safe-area-inset-right);
          padding-bottom: env(safe-area-inset-bottom);
        }
        hui-view {
          background: var(
            --lovelace-background,
            var(--primary-background-color)
          );
        }
        #view > * {
          flex: 1 1 100%;
          max-width: 100%;
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
