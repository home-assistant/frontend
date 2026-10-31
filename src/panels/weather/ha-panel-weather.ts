import { mdiRefresh, mdiWeatherPartlyCloudy } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { debounce } from "../../common/util/debounce";
import { deepEqual } from "../../common/util/deep-equal";
import "../../components/ha-button";
import "../../components/ha-empty-state";
import "../../components/ha-relative-time";
import "../../components/ha-svg-icon";
import "../../components/ha-top-app-bar-fixed";
import type { WeatherFrontendSystemData } from "../../data/frontend";
import { fetchFrontendSystemData } from "../../data/frontend";
import type { LovelaceStrategyViewConfig } from "../../data/lovelace/config/view";
import {
  getPrimaryWeatherEntity,
  getWeatherSources,
} from "../../data/weather_page";
import { ChildPanelReady } from "../../layouts/panel-ready";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showToast } from "../../util/toast";
import { generateLovelaceViewStrategy } from "../lovelace/strategies/get-strategy";
import type { Lovelace } from "../lovelace/types";
import "../lovelace/views/hui-view";
import "../lovelace/views/hui-view-background";
import "../lovelace/views/hui-view-container";

const WEATHER_LOVELACE_VIEW_CONFIG: LovelaceStrategyViewConfig = {
  strategy: {
    type: "weather",
  },
};

@customElement("ha-panel-weather")
class PanelWeather extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _lovelace?: Lovelace;

  @state() private _config?: WeatherFrontendSystemData;

  @state() private _refreshing = false;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  private _childPanelReady?: ChildPanelReady;

  private _loadConfigPromise?: Promise<void>;

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
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

    // A weather service that was just added, or a source that became
    // available, can change which cards have data.
    if (
      oldHass &&
      (oldHass.entities !== this.hass.entities || this._sourcesChanged(oldHass))
    ) {
      this._debounceRegenerate();
    }
  }

  private _sourcesChanged(oldHass: HomeAssistant): boolean {
    return getWeatherSources(this.hass, this._config).some(
      (entityId) =>
        (oldHass.states[entityId]?.state === "unavailable") !==
        (this.hass.states[entityId]?.state === "unavailable")
    );
  }

  private async _setup() {
    this._loadConfigPromise = this._loadConfig();
    await Promise.all([
      this.hass.loadFragmentTranslation("lovelace"),
      this._loadConfigPromise,
    ]);
    await this._setLovelace();
  }

  private async _loadConfig() {
    try {
      this._config =
        (await fetchFrontendSystemData(this.hass.connection, "weather")) ?? {};
    } catch (_err) {
      this._config = {};
      showToast(this, {
        message: this.hass.localize("ui.panel.weather.editor.load_failed"),
        duration: 0,
        dismissable: true,
      });
    }
  }

  private _debounceRegenerate = debounce(() => this._setLovelace(), 200);

  private async _setLovelace() {
    if (this._loadConfigPromise) {
      await this._loadConfigPromise;
    }

    const viewConfig = await generateLovelaceViewStrategy(
      {
        strategy: {
          ...WEATHER_LOVELACE_VIEW_CONFIG.strategy,
          settings: this._config ?? {},
        },
      },
      this.hass
    );

    const config = { views: [viewConfig] };
    const rawConfig = { views: [WEATHER_LOVELACE_VIEW_CONFIG] };

    if (deepEqual(config, this._lovelace?.config)) {
      return;
    }

    this._childPanelReady ??= new ChildPanelReady(this);
    this._lovelace = {
      config: config,
      rawConfig: rawConfig,
      editMode: false,
      urlPath: "weather",
      mode: "generated",
      locale: this.hass.locale,
      enableFullEditMode: () => undefined,
      saveConfig: async () => undefined,
      deleteConfig: async () => undefined,
      setEditMode: () => undefined,
      showToast: () => undefined,
    };
  }

  protected render() {
    return html`
      <ha-top-app-bar-fixed
        .narrow=${this.narrow}
        .backButton=${this._searchParms.has("historyBack")}
      >
        <div slot="title">${this.hass.localize("panel.weather")}</div>
        ${this._renderView()}
      </ha-top-app-bar-fixed>
    `;
  }

  private _renderView() {
    if (!this._lovelace || !this._config) {
      return nothing;
    }
    const sources = getWeatherSources(this.hass, this._config);
    const primary = getPrimaryWeatherEntity(this.hass, sources);

    if (!primary) {
      return html`
        <ha-empty-state
          .icon=${mdiWeatherPartlyCloudy}
          .heading=${this.hass.localize("ui.panel.weather.empty.title")}
          .description=${this.hass.localize(
            "ui.panel.weather.empty.description"
          )}
        ></ha-empty-state>
      `;
    }

    return html`
      <hui-view-container .hass=${this.hass}>
        <hui-view-background .hass=${this.hass}></hui-view-background>
        <hui-view
          .hass=${this.hass}
          .narrow=${this.narrow}
          .lovelace=${this._lovelace}
          .index=${0}
        ></hui-view>
      </hui-view-container>
      <div class="footer">
        <ha-button
          appearance="plain"
          size="s"
          .disabled=${this._refreshing}
          aria-label=${this.hass.localize("ui.panel.weather.refresh")}
          @click=${this._refresh}
        >
          <span>
            ${this.hass.localize("ui.panel.weather.updated", {
              time: html`<ha-relative-time
                .datetime=${primary.last_updated}
              ></ha-relative-time>`,
            })}
          </span>
          <ha-svg-icon
            slot="end"
            class=${this._refreshing ? "spinning" : ""}
            .path=${mdiRefresh}
          ></ha-svg-icon>
        </ha-button>
      </div>
    `;
  }

  private async _refresh() {
    const entityIds = getWeatherSources(this.hass, this._config);
    if (!entityIds.length) {
      return;
    }
    this._refreshing = true;
    try {
      await this.hass.callService("homeassistant", "update_entity", {
        entity_id: entityIds,
      });
    } finally {
      this._refreshing = false;
    }
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
        ha-empty-state {
          min-height: calc(100vh - var(--header-height) - 32px);
        }
        .footer {
          display: flex;
          justify-content: center;
          padding: 0 var(--ha-space-4) var(--ha-space-8);
          color: var(--secondary-text-color);
        }
        .spinning {
          animation: spin 800ms linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .spinning {
            animation: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-weather": PanelWeather;
  }
}
