import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import {
  fetchFrontendSystemData,
  saveFrontendSystemData,
  type HomeFrontendSystemData,
} from "../../data/frontend";
import type { LovelaceDashboardStrategyConfig } from "../../data/lovelace/config/types";
import type { HomeAssistant, PanelInfo, Route } from "../../types";
import { showToast } from "../../util/toast";
import "../lovelace/hui-root";
import { generateLovelaceDashboardStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import { showEditHomeDialog } from "./dialogs/show-dialog-edit-home";

@customElement("ha-panel-home")
class PanelHome extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: false }) public route?: Route;

  @property({ attribute: false }) public panel?: PanelInfo;

  @state() private _lovelace?: Lovelace;

  @state() private _favoriteEntities: string[] = [];

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    // Initial setup
    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");
      this._loadFavorites();
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
      ></hui-root>
    `;
  }

  private async _loadFavorites() {
    try {
      const data = await fetchFrontendSystemData(this.hass.connection, "home");
      this._favoriteEntities = data?.favorite_entities || [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load favorites:", err);
      this._favoriteEntities = [];
    }
    await this._setLovelace();
  }

  private async _setLovelace() {
    const strategyConfig: LovelaceDashboardStrategyConfig = {
      strategy: {
        type: "home",
        favorite_entities: this._favoriteEntities.length > 0 ? this._favoriteEntities : undefined,
      },
    };

    const config = await generateLovelaceDashboardStrategy(
      strategyConfig,
      this.hass
    );

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._lovelace = {
      config: config,
      rawConfig: config,
      editMode: false,
      urlPath: "home",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: this._setEditMode,
      showToast: () => undefined,
    };
  }

  private _setEditMode = () => {
    showEditHomeDialog(this, {
      config: {
        favorite_entities: this._favoriteEntities,
      },
      saveConfig: async (config) => {
        await this._saveConfig(config);
      },
    });
  };

  private async _saveConfig(config: HomeFrontendSystemData): Promise<void> {
    try {
      await saveFrontendSystemData(this.hass.connection, "home", config);
      this._favoriteEntities = config.favorite_entities || [];
      await this._setLovelace();
      showToast(this, {
        message: this.hass.localize("ui.common.successfully_saved"),
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to save home configuration:", err);
      showToast(this, {
        message: this.hass.localize("ui.panel.home.editor.save_failed"),
        duration: 0,
        dismissable: true,
      });
      throw err;
    }
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
