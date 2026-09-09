import {
  mdiDotsHexagon,
  mdiGoogleCirclesCommunities,
  mdiImageFilterCenterFocus,
} from "@mdi/js";
import type {
  Connection,
  HassEntities,
  HassEntity,
} from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { resolveThemeColor } from "../../../common/color/compute-color";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeRTL } from "../../../common/util/compute_rtl";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { getEntityLocation } from "../../../common/entity/get_entity_location";
import { deepEqual } from "../../../common/util/deep-equal";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-alert";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/map/ha-map";
import type {
  HaMap,
  HaMapEntity,
  HaMapPathPoint,
  HaMapPaths,
  MapCardMarkerLabelMode,
} from "../../../components/map/ha-map";
import type { MapLatLng } from "../../../common/map/map-engine";
import {
  entityMapColor,
  subscribeEntityMapColors,
  zoneColor,
} from "../../../common/map/entity-map-colors";
import type { HistoryStates } from "../../../data/history";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import type { HomeAssistant } from "../../../types";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { PANEL_VIEW_LAYOUT } from "../views/const";
import { findEntities } from "../common/find-entities";
import {
  hasConfigChanged,
  hasConfigOrEntitiesChanged,
} from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import type { MapCardConfig, MapEntityConfig } from "./types";
import {
  addEntityToCondition,
  checkConditionsMet,
} from "../common/validate-condition";

export const DEFAULT_HOURS_TO_SHOW = 0;
export const DEFAULT_ZOOM = 14;

// GPS accuracy (meters) above which the selected person's circle is shown
const IMPRECISE_GPS_ACCURACY = 100;

const FOCUS_PERSON_ZOOM = 19;
const FOCUS_ZONE_MAX_ZOOM = 18;

interface GeoEntity {
  entity_id: string;
  label_mode?: MapCardMarkerLabelMode;
  attribute?: string;
  unit?: string;
  focus: boolean;
}

@customElement("hui-map-card")
class HuiMapCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @property({ type: Boolean }) public preview = false;

  @state() private _stateHistory?: HistoryStates;

  @state()
  private _config?: MapCardConfig;

  @query("ha-map")
  private _map?: HaMap;

  private _configEntities?: MapEntityConfig[];

  @state() private _mapEntities: HaMapEntity[] = [];

  // Bumped when entity colors change, so memoized trail colors recompute
  @state() private _colorVersion = 0;

  private _filteredMapEntities: HaMapEntity[] = [];

  @state() private _error?: { code: string; message: string };

  @state() private _clusterMarkers = true;

  @state() private _overviewSelected?: string;

  // Height of the overview drawer when it sits over the bottom of the map
  @state() private _overviewHeight = 0;

  private _overviewLoaded = false;

  private _subscribed?: Promise<(() => Promise<void>) | undefined>;

  private _getAllEntities(): string[] {
    const hass = this.hass!;
    const personSources = new Set<string>();
    const locationEntities: string[] = [];
    Object.values(hass.states).forEach((entity) => {
      if (!getEntityLocation(entity, hass.states)) {
        return;
      }
      locationEntities.push(entity.entity_id);
      if (computeStateDomain(entity) === "person" && entity.attributes.source) {
        personSources.add(entity.attributes.source);
      }
    });

    return locationEntities.filter(
      (entityId) =>
        !hass.entities?.[entityId]?.hidden && !personSources.has(entityId)
    );
  }

  public setConfig(config: MapCardConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    if (
      !config.show_all &&
      !config.entities?.length &&
      !config.geo_location_sources
    ) {
      throw new Error(
        "Either show_all, entities, or geo_location_sources must be specified"
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
    if (config.show_all && (config.entities || config.geo_location_sources)) {
      throw new Error(
        "Cannot specify show_all and entities or geo_location_sources"
      );
    }
    this._config = { ...config };
    if (this.hass && config.show_all) {
      this._config.entities = this._getAllEntities();
    }
    this._configEntities = this._config.entities
      ? processConfigEntities<MapEntityConfig>(this._config.entities)
      : [];
    this._mapEntities = this._getMapEntities();
    this._clusterMarkers = this._config.cluster ?? true;
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

    return { type: "map", entities: foundEntities, theme_mode: "auto" };
  }

  protected firstUpdated() {
    this._mapEntities = this._getMapEntities();
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

    const isDarkMode =
      this._config.dark_mode || this._config.theme_mode === "dark"
        ? true
        : this._config.theme_mode === "light"
          ? false
          : this.hass.themes.darkMode;

    const themeMode =
      this._config.theme_mode || (this._config.dark_mode ? "dark" : "auto");

    return html`
      <ha-card id="card" .header=${this._config.title}>
        <div
          id="root"
          class=${this.layout === PANEL_VIEW_LAYOUT ? "panel-layout" : ""}
          @hass-more-info=${this._handleMapMoreInfo}
        >
          <ha-map
            style=${styleMap({
              "--overview-height": `${this._overviewHeight}px`,
            })}
            .entities=${this._filteredMapEntities}
            .zoom=${this._config.default_zoom ?? DEFAULT_ZOOM}
            .paths=${this._getHistoryPaths(
              this._config,
              this._stateHistory,
              this._colorVersion
            )}
            .autoFit=${this._config.auto_fit || false}
            .fitZones=${this._config.fit_zones || false}
            .zoomPosition=${
              this.layout === PANEL_VIEW_LAYOUT &&
              !computeRTL(
                this.hass.language,
                this.hass.translationMetadata.translations
              )
                ? "topright"
                : "topleft"
            }
            .themeMode=${themeMode}
            .clusterMarkers=${this._clusterMarkers}
            .scaleRuler=${this._config.scale_ruler || false}
            @map-clicked=${this._handleMapClicked}
            interactive-zones
            .renderPassive=${this.layout !== PANEL_VIEW_LAYOUT}
          ></ha-map>
          <div id="buttons">
            ${
              this._filteredMapEntities.length > 1
                ? html`
                    <ha-icon-button
                      .label=${this.hass!.localize(
                        "ui.panel.lovelace.cards.map.toggle_grouping"
                      )}
                      .path=${
                        this._clusterMarkers
                          ? mdiGoogleCirclesCommunities
                          : mdiDotsHexagon
                      }
                      style=${isDarkMode ? "color:#ffffff" : "color:#000000"}
                      @click=${this._toggleClusterMarkers}
                      tabindex="0"
                    ></ha-icon-button>
                  `
                : nothing
            }
            <ha-icon-button
              .label=${this.hass!.localize(
                "ui.panel.lovelace.cards.map.reset_focus"
              )}
              .path=${mdiImageFilterCenterFocus}
              style=${isDarkMode ? "color:#ffffff" : "color:#000000"}
              @click=${this._resetFocus}
              tabindex="0"
            ></ha-icon-button>
          </div>
          ${
            this.layout === PANEL_VIEW_LAYOUT
              ? html`<hui-map-overview
                  id="overview"
                  .entities=${this._filteredMapEntities}
                  .selected=${this._overviewSelected}
                  @map-overview-select=${this._handleOverviewSelect}
                  @map-overview-resize=${this._handleOverviewResize}
                ></hui-map-overview>`
              : nothing
          }
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

    // Allow update when components list changes so we can retry subscription
    if (
      !this._subscribed &&
      !this._error &&
      this._config &&
      oldHass.config.components !== this.hass.config.components
    ) {
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

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (changedProps.has("hass")) {
      this._subscribeColors();
    }
    if (
      this._config?.show_all &&
      !this._config?.entities &&
      this.hass &&
      changedProps.has("hass")
    ) {
      this._config.entities = this._getAllEntities();
      this._configEntities = processConfigEntities<MapEntityConfig>(
        this._config.entities
      );
      this._mapEntities = this._getMapEntities();
    }
    if (
      changedProps.has("hass") &&
      this._config?.geo_location_sources &&
      !deepEqual(
        this._getSourceEntities(changedProps.get("hass")?.states),
        this._getSourceEntities(this.hass.states)
      )
    ) {
      this._mapEntities = this._getMapEntities();
    }

    // Filter entities by conditions
    if (this._config?.conditions && this._mapEntities) {
      const conditions = this._config.conditions;
      this._filteredMapEntities = this._mapEntities.filter((entity) => {
        const conditionWithEntity = conditions.map((condition) =>
          addEntityToCondition(condition, entity.entity_id)
        );
        return checkConditionsMet(conditionWithEntity, this.hass!, {});
      });
    } else {
      this._filteredMapEntities = this._mapEntities;
    }

    if (this.layout === PANEL_VIEW_LAYOUT) {
      if (!this._overviewLoaded) {
        this._overviewLoaded = true;
        void import("./map/hui-map-overview");
      }
      this._filteredMapEntities = this._decorateOverviewEntities(
        this._filteredMapEntities,
        this._overviewSelected,
        this._overviewSelected
          ? this.hass.states[this._overviewSelected]
          : undefined,
        this.preview
      );
    }
  }

  // In panel layout, only the selected zone shows its radius (all of them
  // while editing) and only an imprecise selected person its accuracy circle
  private _decorateOverviewEntities = memoizeOne(
    (
      entities: HaMapEntity[],
      selectedId: string | undefined,
      selectedStateObj: HassEntity | undefined,
      preview: boolean
    ): HaMapEntity[] => {
      const selectedLocation = selectedStateObj
        ? getEntityLocation(selectedStateObj, this.hass.states)
        : undefined;
      const showSelectedAccuracy =
        (selectedLocation?.gpsAccuracy ?? 0) > IMPRECISE_GPS_ACCURACY;
      return entities.map((entity) => ({
        ...entity,
        hide_accuracy: !(
          showSelectedAccuracy && entity.entity_id === selectedId
        ),
        hide_radius: !preview && entity.entity_id !== selectedId,
        selected: entity.entity_id === selectedId,
      }));
    }
  );

  private _unsubscribeColors?: () => void;

  private _colorsConnection?: Connection;

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this._configEntities?.length) {
      this._subscribeHistory();
    }
    this._subscribeColors();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeHistory();
    this._unsubscribeColors?.();
    this._unsubscribeColors = undefined;
    this._colorsConnection = undefined;
  }

  private _subscribeColors(): void {
    const connection = this.hass?.connection;
    if (!connection || this._colorsConnection === connection) {
      return;
    }
    // A replaced connection needs its own subscription
    this._unsubscribeColors?.();
    this._colorsConnection = connection;
    this._unsubscribeColors = subscribeEntityMapColors(connection, () => {
      this._mapEntities = this._getMapEntities();
      this._colorVersion++;
    });
  }

  private _subscribeHistory() {
    if (
      !isComponentLoaded(this.hass!.config, "history") ||
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
      this._config!.hours_to_show ?? DEFAULT_HOURS_TO_SHOW,
      (this._configEntities || []).map((entity) => entity.entity)!,
      false,
      false,
      false
    ).catch((err) => {
      this._subscribed = undefined;
      this._error = err;
      return undefined;
    });
  }

  private _unsubscribeHistory() {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub?.()).catch(() => undefined);
      this._subscribed = undefined;
    }
  }

  protected updated(changedProps: PropertyValues): void {
    if (this._configEntities?.length) {
      if (
        (this.isConnected && !this._subscribed && !this._error) ||
        changedProps.has("_config")
      ) {
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

    const ignoreAspectRatio = this.layout === "panel" || this.layout === "grid";
    if (!this._config || ignoreAspectRatio || !root) {
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

  private _resetFocus() {
    this._map?.fitMap({ unpause_autofit: true });
  }

  private _handleMapClicked() {
    // A click on the map itself (not on a marker) deselects
    if (this._overviewSelected) {
      this._overviewSelected = undefined;
    }
  }

  private _handleMapMoreInfo(ev: HASSDomEvent<{ entityId: string | null }>) {
    if ((ev.target as HTMLElement)?.localName === "hui-map-overview") {
      // The overview asks for the dialog itself, so let it through
      return;
    }
    const entityId = ev.detail.entityId;
    if (
      this.layout !== PANEL_VIEW_LAYOUT ||
      !entityId ||
      !["person", "device_tracker", "zone"].includes(computeDomain(entityId)) ||
      (computeDomain(entityId) !== "zone" &&
        !this._filteredMapEntities.some(
          (entity) => entity.entity_id === entityId
        ))
    ) {
      return;
    }
    ev.stopPropagation();
    this._overviewSelected = entityId;
    this._focusEntity(entityId);
  }

  private _handleOverviewResize(ev: HASSDomEvent<{ height: number }>) {
    this._overviewHeight = ev.detail.height;
  }

  private _handleOverviewSelect(ev: HASSDomEvent<{ entityId?: string }>) {
    this._overviewSelected = ev.detail.entityId;
    if (ev.detail.entityId) {
      this._focusEntity(ev.detail.entityId);
    }
  }

  private _focusEntity(entityId: string) {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return;
    }
    if (computeStateDomain(stateObj) === "zone") {
      const { latitude, longitude, radius } = stateObj.attributes;
      // Convert the zone radius (meters) to a degree offset for a bounding box
      const latOffset = (radius ?? 100) / 111320;
      const lngOffset =
        latOffset / Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
      this._map?.fitBounds(
        [
          [latitude - latOffset, longitude - lngOffset],
          [latitude + latOffset, longitude + lngOffset],
        ],
        { pad: 0.2, zoom: FOCUS_ZONE_MAX_ZOOM }
      );
      return;
    }
    const location = getEntityLocation(stateObj, this.hass.states);
    if (location) {
      this._map?.fitBounds([[location.latitude, location.longitude]], {
        zoom: FOCUS_PERSON_ZOOM,
      });
    }
  }

  private _toggleClusterMarkers() {
    this._clusterMarkers = !this._clusterMarkers;
  }

  // The same color for an entity on every map; a config color still wins
  private _getColor(entityId: string): string {
    const computedStyles = getComputedStyle(this);
    if (computeDomain(entityId) === "zone") {
      const stateObj = this.hass?.states[entityId];
      return zoneColor(
        entityId,
        !!stateObj?.attributes.passive,
        computedStyles
      );
    }
    return entityMapColor(entityId, computedStyles);
  }

  private _getSourceEntities(states?: HassEntities): GeoEntity[] {
    if (!states || !this._config?.geo_location_sources) {
      return [];
    }

    const sourceObjs = this._config.geo_location_sources.map((source) =>
      typeof source === "string" ? { source } : source
    );

    const geoEntities: GeoEntity[] = [];
    // Calculate visible geo location sources
    const allSource = sourceObjs.find((s) => s.source === "all");
    for (const stateObj of Object.values(states)) {
      const sourceObj = sourceObjs.find(
        (s) => s.source === stateObj.attributes.source
      );
      if (
        computeDomain(stateObj.entity_id) === "geo_location" &&
        (allSource || sourceObj)
      ) {
        geoEntities.push({
          entity_id: stateObj.entity_id,
          label_mode: sourceObj?.label_mode ?? allSource?.label_mode,
          attribute: sourceObj?.attribute ?? allSource?.attribute,
          unit: sourceObj?.unit ?? allSource?.unit,
          focus: sourceObj
            ? (sourceObj.focus ?? true)
            : (allSource?.focus ?? true),
        });
      }
    }
    return geoEntities;
  }

  private _getMapEntities(): HaMapEntity[] {
    return [
      ...(this._configEntities || []).map((entityConf) => ({
        entity_id: entityConf.entity,
        color: entityConf.color
          ? resolveThemeColor(entityConf.color)
          : this._getColor(entityConf.entity),
        label_mode: entityConf.label_mode,
        attribute: entityConf.attribute,
        unit: entityConf.unit,
        focus: entityConf.focus,
        name: entityConf.name,
      })),
      ...this._getSourceEntities(this.hass?.states).map((entity) => ({
        ...entity,
        color: this._getColor(entity.entity_id),
      })),
    ];
  }

  private _getHistoryPaths = memoizeOne(
    (
      config: MapCardConfig,
      history: HistoryStates | undefined,
      _colorVersion: number
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
          p.point = [latitude, longitude] as MapLatLng;
          p.timestamp = new Date(entityState.lu * 1000);
          points.push(p);
        }

        const entityConfig = this._configEntities?.find(
          (e) => e.entity === entityId
        );
        const name =
          entityConfig?.name ??
          (entityId in this.hass.states
            ? computeStateName(this.hass.states[entityId])
            : entityId);

        paths.push({
          points,
          name,
          fullDatetime: (config.hours_to_show ?? DEFAULT_HOURS_TO_SHOW) > 144,
          color: entityConfig?.color
            ? resolveThemeColor(entityConfig.color)
            : this._getColor(entityId),
          gradualOpacity: 0.8,
        });
      }
      return paths;
    }
  );

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: "full",
      rows: 4,
      min_columns: 6,
      min_rows: 2,
    };
  }

  static styles = css`
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
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      overflow: hidden;
    }

    #buttons {
      position: absolute;
      top: 75px;
      left: 3px;
      display: flex;
      flex-direction: column;
    }

    /* The overview panel covers the start side in panel layout */
    #root.panel-layout #buttons {
      left: auto;
      inset-inline-start: auto;
      inset-inline-end: 3px;
    }

    #root {
      position: relative;
      height: 100%;
    }

    #overview {
      position: absolute;
      top: var(--ha-space-3);
      inset-inline-start: var(--ha-space-3);
      width: min(360px, calc(100% - 2 * var(--ha-space-3)));
      max-height: calc(100% - 2 * var(--ha-space-3));
      display: flex;
      z-index: 1;
    }

    @media (max-width: 600px) {
      #overview {
        top: auto;
        bottom: 0;
        inset-inline-start: 0;
        inset-inline-end: 0;
        width: auto;
        max-height: 70%;
      }

      /* Keep the attribution and scale ruler above the drawer */
      #root.panel-layout ha-map {
        --ha-map-bottom-inset: calc(
          var(--overview-height, 0px) + var(--ha-space-2)
        );
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-map-card": HuiMapCard;
  }
}
