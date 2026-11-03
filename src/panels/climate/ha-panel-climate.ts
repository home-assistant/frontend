import { mdiPencil } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-button";
import "../../components/ha-icon-button";
import "../../components/ha-top-app-bar-fixed";
import {
  fetchFrontendSystemDataAfterSaves,
  queueFrontendSystemDataSave,
  type ClimateFrontendSystemData,
} from "../../data/frontend";
import type { LovelaceStrategyViewConfig } from "../../data/lovelace/config/view";
import { ChildPanelReady } from "../../layouts/panel-ready";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-background";
import "../lovelace/views/hui-view-container";

const CLIMATE_LOVELACE_VIEW_CONFIG: LovelaceStrategyViewConfig = {
  strategy: {
    type: "climate",
  },
};

@customElement("ha-panel-climate")
class PanelClimate extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _viewIndex = 0;

  @state() private _lovelace?: Lovelace;

  @state() private _config?: ClimateFrontendSystemData;

  @state() private _editVisibility = false;

  @state() private _searchParams = new URLSearchParams(window.location.search);

  private _childPanelReady?: ChildPanelReady;

  private _loadConfigPromise?: Promise<void>;

  private _loadConfigRevision = 0;

  private _setLovelaceRevision = 0;

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
    if (
      oldHass &&
      this.hass.config.state === "RUNNING" &&
      oldHass.config.state !== "RUNNING"
    ) {
      this._setup();
      return;
    }

    if (oldHass && oldHass.localize !== this.hass.localize) {
      this._setLovelace();
      return;
    }

    if (oldHass && this.hass) {
      // Refresh the generated view when registries or panels change.
      if (
        oldHass.entities !== this.hass.entities ||
        oldHass.devices !== this.hass.devices ||
        oldHass.areas !== this.hass.areas ||
        oldHass.floors !== this.hass.floors ||
        oldHass.panels !== this.hass.panels
      ) {
        if (this.hass.config.state === "RUNNING") {
          this._debounceRegistriesChanged();
        }
      }
    }
  }

  private async _setup() {
    this._loadConfigPromise = this._loadConfig();
    await Promise.all([
      this.hass.loadFragmentTranslation("lovelace"),
      this._loadConfigPromise,
    ]);
    this._setLovelace();
  }

  private async _loadConfig() {
    const revision = ++this._loadConfigRevision;
    this._config = undefined;
    try {
      const data = await fetchFrontendSystemDataAfterSaves(
        this.hass.connection,
        "climate"
      );
      if (revision !== this._loadConfigRevision) {
        return;
      }
      this._config = data || {};
    } catch (err) {
      if (revision !== this._loadConfigRevision) {
        return;
      }
      // eslint-disable-next-line no-console
      console.error("Failed to load climate configuration:", err);
      showToast(this, {
        message: this.hass.localize("ui.panel.climate.editor.load_failed"),
        duration: 0,
        dismissable: true,
      });
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
    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${this._searchParams.has("historyBack")}
      >
        <div slot="title">${this.hass.localize("panel.climate")}</div>
        ${
          !this.hass.user?.is_admin
            ? nothing
            : this._editVisibility
              ? html`<ha-button
                  slot="actionItems"
                  appearance="filled"
                  size="s"
                  @click=${this._stopEditVisibility}
                >
                  ${this.hass.localize("ui.panel.lovelace.menu.exit_edit_mode")}
                </ha-button>`
              : this._config
                ? html`<ha-icon-button
                    slot="actionItems"
                    .path=${mdiPencil}
                    .label=${this.hass.localize("ui.panel.climate.editor.title")}
                    @click=${this._startEditVisibility}
                  ></ha-icon-button>`
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
                    @entity-visibility-changed=${this._visibilityChanged}
                  ></hui-view
                ></hui-view-container>
              `
            : nothing
        }
      </ha-top-app-bar-fixed>
    `;
  }

  private async _setLovelace(force = false) {
    const revision = ++this._setLovelaceRevision;
    if (this._loadConfigPromise) {
      await this._loadConfigPromise;
    }

    const viewConfig = await generateLovelaceViewStrategy(
      {
        strategy: {
          ...CLIMATE_LOVELACE_VIEW_CONFIG.strategy,
          hidden_entities: this._config?.hidden_entities,
          edit_visibility: this._editVisibility || undefined,
        },
      },
      this.hass
    );

    if (revision !== this._setLovelaceRevision) {
      return;
    }

    const config = { views: [viewConfig] };
    const rawConfig = { views: [CLIMATE_LOVELACE_VIEW_CONFIG] };

    if (!force && deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._childPanelReady ??= new ChildPanelReady(this);
    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "climate",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  private _startEditVisibility = () => {
    this._editVisibility = true;
    this._setLovelace();
  };

  private _stopEditVisibility = () => {
    this._editVisibility = false;
    if (!this._config) {
      this._loadConfigPromise = this._loadConfig();
    }
    this._setLovelace();
  };

  private _visibilityChanged = (
    ev: HASSDomEvent<HASSDomEvents["entity-visibility-changed"]>
  ) => {
    if (!this._config) {
      return;
    }
    const { entity, hidden } = ev.detail;
    const hiddenEntities = (this._config.hidden_entities ?? []).filter(
      (entityId) => entityId !== entity
    );
    if (hidden) {
      hiddenEntities.push(entity);
    }
    this._saveConfig({
      ...this._config,
      hidden_entities: hiddenEntities.length ? hiddenEntities : undefined,
    });
  };

  private _saveConfig(config: ClimateFrontendSystemData): Promise<void> {
    this._config = config;
    return queueFrontendSystemDataSave(
      this.hass.connection,
      "climate",
      config
    ).catch(async (err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to save climate configuration:", err);
      showToast(this, {
        message: this.hass.localize("ui.panel.climate.editor.save_failed"),
        duration: 0,
        dismissable: true,
      });
      if (config !== this._config) {
        return;
      }
      await this._loadConfig();
      await this._setLovelace(true);
    });
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
          min-height: 100vh;
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
    "ha-panel-climate": PanelClimate;
  }
}
