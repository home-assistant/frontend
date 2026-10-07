import {
  mdiDotsHexagon,
  mdiGoogleCirclesCommunities,
  mdiImageFilterCenterFocus,
} from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import type { ContextType } from "@lit/context";
import {
  consume,
  ContextSubscriptionController,
} from "../../../common/decorators/consume";
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
import type { MapFitPadding, MapLatLng } from "../../../common/map/map-engine";
import {
  circleBoundsPoints,
  pixelDistance,
} from "../../../common/map/map-engine";
import {
  entityMapColor,
  zoneColor,
} from "../../../common/map/entity-map-colors";
import type { HistoryStates } from "../../../data/history";
import { subscribeHistoryStatesTimeWindow } from "../../../data/history";
import type { Themes } from "../../../data/ws-themes";
import { fullEntitiesContext, uiContext } from "../../../data/context";
import { transform } from "../../../common/decorators/transform";
import type { EntityRegistryEntry } from "../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../types";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import type { OverviewTab } from "./map/hui-map-overview";
import { PANEL_VIEW_LAYOUT } from "../views/const";
import { navigate, replaceCurrentUrl } from "../../../common/navigate";
import { mainWindow } from "../../../common/dom/get_main_window";
import { constructUrlCurrentPath } from "../../../common/url/construct-url";
import { currentPath } from "../../../common/url/current-path";
import {
  addSearchParam,
  extractSearchParam,
  removeSearchParam,
} from "../../../common/url/search-params";
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

// Margin around the overview (--ha-space-3), in pixels
const OVERVIEW_GAP = 12;

const FOCUS_MAX_ZOOM = 17;
const FOCUS_CLEARANCE_PX = 80;
const SELECTED_ENTITY_PARAM = "entity_id";
const SELECTABLE_DOMAINS = ["person", "device_tracker", "zone"];

interface GeoEntity {
  entity_id: string;
  label_mode?: MapCardMarkerLabelMode;
  attribute?: string;
  unit?: string;
  focus: boolean;
}

@customElement("hui-map-card")
class HuiMapCard extends LitElement implements LovelaceCard {
  constructor() {
    super();
    new ContextSubscriptionController(this, fullEntitiesContext, (entries) => {
      this._entityReg = entries;
      this._mapEntities = this._getMapEntities();
    });
  }

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

  private _filteredMapEntities: HaMapEntity[] = [];

  // The overview lists people the map snapshot missed (e.g. no location yet),
  // so it holds the map entities plus those, who may have no marker of their
  // own until they are located.
  private _overviewEntities: HaMapEntity[] = [];

  @state() private _error?: { code: string; message: string };

  // Registry creation order decides the palette colors
  @state() private _entityReg: EntityRegistryEntry[] = [];

  // Palette colors are read from the theme when the entities are built
  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<ContextType<typeof uiContext>, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes?: Themes;

  @state() private _clusterMarkers = true;

  @state() private _overviewSelected?: string;

  private _path?: string;

  @state() private _overviewTab: OverviewTab = "people";

  // Height of the overview drawer when it sits over the bottom of the map
  @state() private _overviewSize = { width: 0, height: 0 };

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
          class=${classMap({
            "panel-layout": this.layout === PANEL_VIEW_LAYOUT,
            rtl: computeRTL(
              this.hass.language,
              this.hass.translationMetadata.translations
            ),
          })}
          @hass-more-info=${this._handleMapMoreInfo}
        >
          <ha-map
            style=${styleMap({
              "--overview-height": `${this._overviewSize.height}px`,
              "--overview-width": `${this._overviewSize.width}px`,
            })}
            .entities=${this._filteredMapEntities}
            .zoom=${this._config.default_zoom ?? DEFAULT_ZOOM}
            .paths=${this._getHistoryPaths(
              this._config,
              this._stateHistory,
              this._entityReg,
              this._themes
            )}
            .autoFit=${this._config.auto_fit || false}
            .fitPadding=${this._overviewPadding()}
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
            .mapStyle=${this._config.map_style}
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
            this.layout === PANEL_VIEW_LAYOUT && !this.preview
              ? html`<hui-map-overview
                  id="overview"
                  .entities=${this._overviewEntities}
                  .selected=${this._overviewSelected}
                  .tab=${this._overviewTab}
                  @map-overview-select=${this._handleOverviewSelect}
                  @map-overview-tab=${this._handleOverviewTab}
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
    if (changedProps.has("layout")) {
      this._syncSelection();
    }
    if (changedProps.has("preview") && this.preview) {
      this._overviewSize = { width: 0, height: 0 };
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
    // Private state is not in keyof this
    if ((changedProps as PropertyValues).has("_themes") && this.hasUpdated) {
      this._mapEntities = this._getMapEntities();
    }

    // Filter entities by conditions
    if (this._config?.conditions && this._mapEntities) {
      this._filteredMapEntities = this._mapEntities.filter((entity) =>
        this._meetsConditions(entity.entity_id)
      );
    } else {
      this._filteredMapEntities = this._mapEntities;
    }

    if (this.layout === PANEL_VIEW_LAYOUT) {
      if (!this._overviewLoaded) {
        this._overviewLoaded = true;
        void import("./map/hui-map-overview");
      }
      // Keep people and standalone trackers the snapshot missed so they appear
      // once they locate.
      const entities = this._config?.show_all
        ? this._withMissingTracked(this._filteredMapEntities)
        : this._filteredMapEntities;
      this._overviewEntities = this._decorateOverviewEntities(
        entities,
        this._overviewSelected,
        this.preview ||
          this._config?.show_zone_radius ||
          this._overviewTab === "zones"
      );
      // Without the overview, while editing, every marker shows
      this._filteredMapEntities = this.preview
        ? this._overviewEntities
        : this._filterByOverviewTab(
            this._overviewEntities,
            this._overviewTab,
            this._overviewSelected
          );
    }
  }

  private _meetsConditions(entityId: string): boolean {
    const conditions = this._config?.conditions;
    if (!conditions) {
      return true;
    }
    return checkConditionsMet(
      conditions.map((condition) => addEntityToCondition(condition, entityId)),
      this.hass!,
      {}
    );
  }

  // show_all freezes located entities, so a person or standalone tracker that
  // locates later is missing. Add every eligible one and let the map and
  // overview skip it until it has coordinates. Trackers owned by a person are
  // shown through that person, so they are left out here.
  private _withMissingTracked(entities: HaMapEntity[]): HaMapEntity[] {
    const hass = this.hass;
    if (!hass) {
      return entities;
    }
    const present = new Set(entities.map((entity) => entity.entity_id));
    const personSources = new Set<string>();
    Object.values(hass.states).forEach((stateObj) => {
      if (
        computeStateDomain(stateObj) === "person" &&
        stateObj.attributes.source
      ) {
        personSources.add(stateObj.attributes.source);
      }
    });
    const extra: HaMapEntity[] = [];
    Object.values(hass.states).forEach((stateObj) => {
      const entityId = stateObj.entity_id;
      const domain = computeStateDomain(stateObj);
      const eligible =
        domain === "person" ||
        (domain === "device_tracker" && !personSources.has(entityId));
      if (
        eligible &&
        !present.has(entityId) &&
        !hass.entities?.[entityId]?.hidden &&
        this._meetsConditions(entityId)
      ) {
        extra.push({ entity_id: entityId, color: this._getColor(entityId) });
      }
    });
    return extra.length ? [...entities, ...extra] : entities;
  }

  // In panel layout, only the selected zone shows its radius (all of them on
  // the Zones tab, while editing, or when configured) and only the selected
  // person its accuracy circle
  private _decorateOverviewEntities = memoizeOne(
    (
      entities: HaMapEntity[],
      selectedId: string | undefined,
      showRadii: boolean
    ): HaMapEntity[] =>
      entities.map((entity) => ({
        ...entity,
        hide_accuracy: entity.entity_id !== selectedId,
        hide_radius: !showRadii && entity.entity_id !== selectedId,
        selected: entity.entity_id === selectedId,
      }))
  );

  private _filterByOverviewTab = memoizeOne(
    (
      entities: HaMapEntity[],
      tab: OverviewTab,
      selected?: string
    ): HaMapEntity[] =>
      entities.filter((entity) => {
        if (entity.entity_id === selected) {
          return true;
        }
        const domain = computeDomain(entity.entity_id);
        if (domain === "person") {
          return tab === "people";
        }
        if (domain === "device_tracker") {
          return tab === "devices";
        }
        return true;
      })
  );

  public connectedCallback() {
    super.connectedCallback();
    this._path = currentPath();
    mainWindow.addEventListener("popstate", this._syncSelection);
    mainWindow.addEventListener("location-changed", this._syncSelection);
    this._syncSelection();
    if (this.hasUpdated && this._configEntities?.length) {
      this._subscribeHistory();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    mainWindow.removeEventListener("popstate", this._syncSelection);
    mainWindow.removeEventListener("location-changed", this._syncSelection);
    this._unsubscribeHistory();
  }

  private _syncSelection = () => {
    if (this.layout !== PANEL_VIEW_LAYOUT || currentPath() !== this._path) {
      return;
    }
    const entityId = extractSearchParam(SELECTED_ENTITY_PARAM);
    const selectable =
      !!entityId && SELECTABLE_DOMAINS.includes(computeDomain(entityId));
    if (entityId && !selectable) {
      replaceCurrentUrl(
        constructUrlCurrentPath(removeSearchParam(SELECTED_ENTITY_PARAM))
      );
    }
    this._overviewSelected = selectable ? entityId : undefined;
  };

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
    if (
      changedProps.has("_overviewSelected") &&
      this._overviewSelected &&
      this.layout === PANEL_VIEW_LAYOUT
    ) {
      this._focusEntity(this._overviewSelected);
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
    if (this._overviewSelected) {
      this._deselect();
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
      !SELECTABLE_DOMAINS.includes(computeDomain(entityId)) ||
      (computeDomain(entityId) !== "zone" &&
        !this._filteredMapEntities.some(
          (entity) => entity.entity_id === entityId
        ))
    ) {
      return;
    }
    ev.stopPropagation();
    this._select(entityId);
  }

  private _handleOverviewResize(
    ev: HASSDomEvent<{ width: number; height: number }>
  ) {
    const { width, height } = ev.detail;
    // A collapsed overview keeps its width; zero both so it reserves no space.
    this._overviewSize =
      width && height ? { width, height } : { width: 0, height: 0 };
    // A focused fit pauses auto-fit, so refit to apply the new padding.
    if (this._overviewSelected) {
      this._focusEntity(this._overviewSelected);
    }
  }

  private _handleOverviewTab(
    ev: HASSDomEvent<HASSDomEvents["map-overview-tab"]>
  ) {
    this._overviewTab = ev.detail.tab;
  }

  private _handleOverviewSelect(ev: HASSDomEvent<{ entityId?: string }>) {
    if (ev.detail.entityId) {
      this._select(ev.detail.entityId);
    } else {
      this._deselect();
    }
  }

  private _deselect() {
    this._navigateSelection(removeSearchParam(SELECTED_ENTITY_PARAM));
  }

  private _select(entityId: string) {
    if (entityId === this._overviewSelected) {
      this._focusEntity(entityId);
      return;
    }
    this._navigateSelection(
      addSearchParam({ [SELECTED_ENTITY_PARAM]: entityId })
    );
  }

  private _navigateSelection(searchParams: string) {
    navigate(constructUrlCurrentPath(searchParams));
  }

  private _focusEntity(entityId: string) {
    const stateObj = this.hass.states[entityId];
    const center = this._entityCenter(entityId);
    if (!stateObj || !center) {
      return;
    }
    const zoom = this._map?.getView()?.zoom;
    const zone = computeStateDomain(stateObj) === "zone";
    this._map?.fitBounds(
      zone
        ? circleBoundsPoints(center, stateObj.attributes.radius ?? 100)
        : [center],
      {
        pad: 0.2,
        zoom: zoom === undefined || zone ? zoom : this._focusZoom(center, zoom),
        padding: this._overviewPadding(),
        fly: !this._map.containsLocation(center),
      }
    );
  }

  private _entityCenter(entityId: string): MapLatLng | undefined {
    const stateObj = this.hass.states[entityId];
    const location = stateObj && getEntityLocation(stateObj, this.hass.states);
    return location && [location.latitude, location.longitude];
  }

  // Zoom in only as far as it takes to clear the nearest other marker
  private _focusZoom(center: MapLatLng, zoom: number): number {
    let nearest = Infinity;
    for (const entity of this._filteredMapEntities) {
      const other = this._entityCenter(entity.entity_id);
      if (other && (other[0] !== center[0] || other[1] !== center[1])) {
        nearest = Math.min(nearest, pixelDistance(center, other, zoom));
      }
    }
    return Math.max(
      zoom,
      Math.min(FOCUS_MAX_ZOOM, zoom + Math.log2(FOCUS_CLEARANCE_PX / nearest))
    );
  }

  // The part of the map the overview covers, so fitted markers land next to
  // it rather than under it: the bottom sheet on phones, the start side
  // otherwise (see the #overview styles). Memoized so the map only refits
  // when the drawer actually changes size.
  private _overviewPadding(): MapFitPadding | undefined {
    // The overview, and its padding, only exist in panel layout.
    if (this.layout !== PANEL_VIEW_LAYOUT) {
      return undefined;
    }
    return this._paddingFor(
      this._overviewSize.width,
      this._overviewSize.height,
      this.hass.language,
      this.hass.translationMetadata.translations
    );
  }

  private _paddingFor = memoizeOne(
    (
      width: number,
      height: number,
      language: string,
      translations: HomeAssistant["translationMetadata"]["translations"]
    ): MapFitPadding | undefined => {
      if (!width || !height) {
        return undefined;
      }
      if (window.matchMedia("(max-width: 600px)").matches) {
        return { bottom: height + OVERVIEW_GAP };
      }
      const side = width + 2 * OVERVIEW_GAP;
      return computeRTL(language, translations)
        ? { right: side }
        : { left: side };
    }
  );

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
        this._entityReg,
        computedStyles
      );
    }
    return entityMapColor(entityId, this._entityReg, computedStyles);
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
      // Trail colors follow the registry order and the theme like the markers
      _entityReg: EntityRegistryEntry[],
      _themes: Themes | undefined
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
          const latitude = entityState.a?.latitude;
          const longitude = entityState.a?.longitude;
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

    #root.panel-layout {
      --map-bleed-left: var(--view-container-inset-left, 0px);
      --map-bleed-right: var(--view-container-inset-right, 0px);
      --map-bleed-bottom: var(--view-container-inset-bottom, 0px);
    }
    #card:has(#root.panel-layout) {
      overflow: visible;
    }
    #root.panel-layout ha-map {
      left: calc(-1 * var(--map-bleed-left));
      right: calc(-1 * var(--map-bleed-right));
      bottom: calc(-1 * var(--map-bleed-bottom));
      width: auto;
      height: auto;
    }

    /* Keep the attribution and scale ruler clear of the drawer: beside it on
       wide layouts, above it on phones. The controls sit at physical corners. */
    #root.panel-layout ha-map {
      --ha-map-left-inset: calc(
        var(--overview-width, 0px) + 2 * var(--ha-space-3) +
          var(--map-bleed-left)
      );
      --ha-map-right-inset: var(--map-bleed-right);
      --ha-map-bottom-inset: var(--map-bleed-bottom);
    }
    #root.panel-layout.rtl ha-map {
      --ha-map-left-inset: var(--map-bleed-left);
      --ha-map-right-inset: calc(
        var(--overview-width, 0px) + 2 * var(--ha-space-3) +
          var(--map-bleed-right)
      );
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

      #root.panel-layout ha-map,
      #root.panel-layout.rtl ha-map {
        --ha-map-left-inset: var(--map-bleed-left);
        --ha-map-right-inset: var(--map-bleed-right);
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
