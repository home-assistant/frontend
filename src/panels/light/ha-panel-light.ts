import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { goBack } from "../../common/navigate";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-icon-button-arrow-prev";
import "../../components/ha-menu-button";
import "../../components/ha-top-app-bar-fixed";
import type { LovelaceStrategyViewConfig } from "../../data/lovelace/config/view";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-container";
import "../lovelace/views/hui-view-background";

const LIGHT_LOVELACE_VIEW_CONFIG: LovelaceStrategyViewConfig = {
  strategy: {
    type: "light",
  },
};

@customElement("ha-panel-light")
class PanelLight extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  public willUpdate(changedProps: PropertyValues) {
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
        oldHass.floors !== this.hass.floors
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

  private _back(ev) {
    ev.stopPropagation();
    goBack();
  }

  protected render() {
    return html`
      <ha-top-app-bar-fixed .narrow=${this.narrow}>
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
        <div slot="title">${this.hass.localize("panel.light")}</div>
        ${this._lovelace
          ? html`
              <hui-view-container .hass=${this.hass}>
                <hui-view-background .hass=${this.hass}> </hui-view-background>
                <hui-view
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .lovelace=${this._lovelace}
                  .index=${this._viewIndex}
                ></hui-view>
              </hui-view-container>
            `
          : nothing}
      </ha-top-app-bar-fixed>
    `;
  }

  private async _setLovelace() {
    const viewConfig = await generateLovelaceViewStrategy(
      LIGHT_LOVELACE_VIEW_CONFIG,
      this.hass
    );

    const config = { views: [viewConfig] };
    const rawConfig = { views: [LIGHT_LOVELACE_VIEW_CONFIG] };

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "light",
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
          -ms-user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }
        hui-view-container {
          position: relative;
          display: flex;
          min-height: calc(
            100vh - var(--header-height, 0px) - var(
                --safe-area-inset-top,
                0px
              ) - var(--safe-area-inset-bottom, 0px)
          );
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
    "ha-panel-light": PanelLight;
  }
}
