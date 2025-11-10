import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import type { LovelaceDashboardStrategyConfig } from "../../data/lovelace/config/types";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { generateLovelaceDashboardStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/hui-root";

const HOME_LOVELACE_CONFIG: LovelaceDashboardStrategyConfig = {
  strategy: {
    type: "home",
  },
};

@customElement("ha-panel-home")
class PanelHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._setLovelace();
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

  private _debounceRegistriesChanged = debounce(
    () => this._registriesChanged(),
    200
  );

  private _registriesChanged = async () => {
    this._setLovelace();
  };

  protected render() {
    if (!this._lovelace) {
      return nothing;
    }

    return html`
      <hui-root
        .hass=${this.hass}
        .narrow=${this.narrow}
        .lovelace=${this._lovelace}
        .route=${this.route}
        .panel=${this.panel}
        no-edit
      ></hui-root>
    `;
  }

  private async _setLovelace() {
    const config = await generateLovelaceDashboardStrategy(
      HOME_LOVELACE_CONFIG,
      this.hass
    );

    const rawConfig = HOME_LOVELACE_CONFIG;

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "home",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-home": PanelHome;
  }
}
