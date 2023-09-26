import { mdiImageFilterCenterFocus } from "@mdi/js";
import { isToday } from "date-fns";
import { HassEntities } from "home-assistant-js-websocket";
import { LatLngTuple } from "leaflet";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { getColorByIndex } from "../../../common/color/colors";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import {
  formatTimeWithSeconds,
  formatTimeWeekday,
} from "../../../common/datetime/format_time";
import { computeDomain } from "../../../common/entity/compute_domain";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-card";
import "../../../components/ha-alert";
import "../../../components/ha-icon-button";
import "../../../components/map/ha-map";
import type {
  HaMap,
  HaMapPathPoint,
  HaMapPaths,
} from "../../../components/map/ha-map";
import {
  HistoryStates,
  subscribeHistoryStatesTimeWindow,
} from "../../../data/history";
import {
  hasConfigChanged,
  hasConfigOrEntitiesChanged,
} from "../common/has-changed";
import { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { processConfigEntities } from "../common/process-config-entities";
import { EntityConfig } from "../entity-rows/types";
import { LovelaceCard } from "../types";
import { MapCardConfig } from "./types";

export const DEFAULT_HOURS_TO_SHOW = 0;
export const DEFAULT_ZOOM = 14;

interface MapEntityConfig extends EntityConfig {
  label_mode?: "state" | "name";
  focus?: boolean;
}

@customElement("hui-map-card")
class HuiMapCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public isPanel = false;

  @state() private _stateHistory?: HistoryStates;

  @state()
  private _config?: MapCardConfig;

  @query("ha-map")
  private _map?: HaMap;

  private _configEntities?: MapEntityConfig[];

  private _colorDict: Record<string, string> = {};

  private _colorIndex = 0;

  @state() private _error?: { code: string; message: string };

  private _subscribed?: Promise<(() => Promise<void>) | void>;

  public setConfig(config: MapCardConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    if (!config.entities?.length && !config.geo_location_sources) {
      throw new Error(
        "Either entities or geo_location_sources must be specified"
      );
    }
    if (config.entities && !Array.isArray(config.entities)) {
      throw new Error("Entities need to be an array");
    }
    if (
      config.geo_location_sources &&
      !Array.isArray(config.geo_location_sources)
    ) {
      throw new Error("Parameter geo_location_sources needs to be an array");
    }

    this._config = config;
    this._configEntities = config.entities
      ? processConfigEntities<MapEntityConfig>(config.entities)
      : [];
  }

  public getCardSize(): number {
    if (!this._config?.aspect_ratio) {
      return 7;
    }

    const ratio = parseAspectRatio(this._config.aspect_ratio);
    const ar =
      ratio && ratio.w > 0 && ratio.h > 0
        ? `${((100 * ratio.h) / ratio.w).toFixed(2)}`
        : "100";

    return 1 + Math.floor(Number(ar) / 25) || 3;
  }

  public static async getConfigElement() {
    await import("../editor/config-elements/hui-map-card-editor");
    return document.createElement("hui-map-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): MapCardConfig {
    const includeDomains = ["device_tracker"];
    const maxEntities = 2;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "map", entities: foundEntities };
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }
    if (this._error) {
      return html`<ha-alert alert-type="error">
        ${this.hass.localize("ui.components.map.error")}: ${this._error.message}
        (${this._error.code})
      </ha-alert>`;
    }
    return html`
      <ha-card id="card" .header=${this._config.title}>
        <div id="root">
          <ha-map
            .hass=${this.hass}
            .entities=${this._getEntities(
              this.hass.states,
              this._config,
              this._configEntities
            )}
            .zoom=${this._config.default_zoom ?? DEFAULT_ZOOM}
            .paths=${this._getHistoryPaths(this._config, this._stateHistory)}
            .autoFit=${this._config.auto_fit}
            .darkMode=${this._config.dark_mode}
            interactiveZones
            renderPassive
          ></ha-map>
          <ha-icon-button
            .label=${this.hass!.localize(
              "ui.panel.lovelace.cards.map.reset_focus"
            )}
            .path=${mdiImageFilterCenterFocus}
            @click=${this._fitMap}
            tabindex="0"
          ></ha-icon-button>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues) {
    if (!changedProps.has("hass") || changedProps.size > 1) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (!oldHass || !this._configEntities) {
      return true;
    }

    if (oldHass.themes.darkMode !== this.hass.themes.darkMode) {
      return true;
    }

    if (changedProps.has("_stateHistory")) {
      return true;
    }

    if (this._config?.geo_location_sources) {
      if (oldHass.states !== this.hass.states) {
        return true;
      }
    }

    return this._config?.entities
      ? hasConfigOrEntitiesChanged(this, changedProps)
      : hasConfigChanged(this, changedProps);
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this._configEntities?.length) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
  }

  private _subscribeHistory() {
    if (
      !isComponentLoaded(this.hass!, "history") ||
      this._subscribed ||
      !(this._config?.hours_to_show ?? DEFAULT_HOURS_TO_SHOW)
    ) {
      return;
    }
    this._subscribed = subscribeHistoryStatesTimeWindow(
      this.hass!,
      (combinedHistory) => {
        if (!this._subscribed) {
          // Message came in before we had a chance to unload
          return;
        }
        this._stateHistory = combinedHistory;
      },
      this._config!.hours_to_show! ?? DEFAULT_HOURS_TO_SHOW,
      (this._configEntities || []).map((entity) => entity.entity)!,
      false,
      false,
      false
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
    });
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.());
      this._subscribed = undefined;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (this._configEntities?.length) {
      if (!this._subscribed || changedProps.has("_config")) {
        this._unsubscribeHistory();
        this._subscribeHistory();
      }
    } else {
      this._unsubscribeHistory();
    }
    if (changedProps.has("_config")) {
      this._computePadding();
    }
  }

  private _computePadding(): void {
    const root = this.shadowRoot!.getElementById("root");
    if (!this._config || this.isPanel || !root) {
      return;
    }

    if (!this._config.aspect_ratio) {
      root.style.paddingBottom = "100%";
      return;
    }

    root.style.height = "auto";

    const ratio = parseAspectRatio(this._config.aspect_ratio);

    root.style.paddingBottom =
      ratio && ratio.w > 0 && ratio.h > 0
        ? `${((100 * ratio.h) / ratio.w).toFixed(2)}%`
        : (root.style.paddingBottom = "100%");
  }

  private _fitMap() {
    this._map?.fitMap();
  }

  private _getColor(entityId: string): string {
    let color = this._colorDict[entityId];
    if (color) {
      return color;
    }
    color = getColorByIndex(this._colorIndex);
    this._colorIndex++;
    this._colorDict[entityId] = color;
    return color;
  }

  private _getEntities = memoizeOne(
    (
      states: HassEntities,
      config: MapCardConfig,
      configEntities?: MapEntityConfig[]
    ) => {
      if (!states || !config) {
        return undefined;
      }

      const geoEntities: string[] = [];
      if (config.geo_location_sources) {
        // Calculate visible geo location sources
        const includesAll = config.geo_location_sources.includes("all");
        for (const stateObj of Object.values(states)) {
          if (
            computeDomain(stateObj.entity_id) === "geo_location" &&
            (includesAll ||
              config.geo_location_sources.includes(stateObj.attributes.source))
          ) {
            geoEntities.push(stateObj.entity_id);
          }
        }
      }

      return [
        ...(configEntities || []).map((entityConf) => ({
          entity_id: entityConf.entity,
          color: this._getColor(entityConf.entity),
          label_mode: entityConf.label_mode,
          focus: entityConf.focus,
          name: entityConf.name,
        })),
        ...geoEntities.map((entity) => ({
          entity_id: entity,
          color: this._getColor(entity),
        })),
      ];
    }
  );

  private _getHistoryPaths = memoizeOne(
    (
      config: MapCardConfig,
      history?: HistoryStates
    ): HaMapPaths[] | undefined => {
      if (!history || !(config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW)) {
        return undefined;
      }

      const paths: HaMapPaths[] = [];

      for (const entityId of Object.keys(history)) {
        if (computeDomain(entityId) === "zone") {
          continue;
        }
        const entityStates = history[entityId];
        if (!entityStates?.length) {
          continue;
        }
        // filter location data from states and remove all invalid locations
        const points: HaMapPathPoint[] = [];
        for (const entityState of entityStates) {
          const latitude = entityState.a.latitude;
          const longitude = entityState.a.longitude;
          if (!latitude || !longitude) {
            continue;
          }
          const p = {} as HaMapPathPoint;
          p.point = [latitude, longitude] as LatLngTuple;
          const t = new Date(entityState.lu * 1000);
          if ((config.hours_to_show! ?? DEFAULT_HOURS_TO_SHOW) > 144) {
            // if showing > 6 days in the history trail, show the full
            // date and time
            p.tooltip = formatDateTime(t, this.hass.locale, this.hass.config);
          } else if (isToday(t)) {
            p.tooltip = formatTimeWithSeconds(
              t,
              this.hass.locale,
              this.hass.config
            );
          } else {
            p.tooltip = formatTimeWeekday(
              t,
              this.hass.locale,
              this.hass.config
            );
          }
          points.push(p);
        }
        paths.push({
          points,
          color: this._getColor(entityId),
          gradualOpacity: 0.8,
        });
      }
      return paths;
    }
  );

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        overflow: hidden;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      ha-map {
        z-index: 0;
        border: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: inherit;
      }

      ha-icon-button {
        position: absolute;
        top: 75px;
        left: 3px;
        outline: none;
      }

      #root {
        position: relative;
        height: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card": HuiMapCard;
  }
}
