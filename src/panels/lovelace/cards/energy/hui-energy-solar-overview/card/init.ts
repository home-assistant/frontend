//Card init subsystem: home-coord resolution, visual-config hashing, the engine bootstrap path, and
//the visibility observer that pauses animations when the card scrolls offscreen.

import type { SolarOverviewCardConfig } from "../constants";
import { SolarOverviewEngine } from "../hui-energy-solar-overview-engine";
import {
  refreshOverlays,
  setAnimationsPaused,
  type OverlaysHost,
} from "./overlays";

//Visual config keys the engine reacts to via updateConfig() without a full respawn. Exhaustive: a
//missing key would leave the engine on stale values until the next natural respawn.
//camera-* keys are deliberately excluded (a slider drag would respawn the WebGL context every
//frame); the editor pushes those through engine.setCamera* and bakes them into the config instead.
export const VISUAL_CONFIG_KEYS = [
  "show-labels",
  "map-style",
  "display-radius",
  "building-cluster-radius",
  "building-opacity",
] as const;

//Defensive coord parser: bare Number() coerces '', false, [], null all to 0 (a valid latitude) and
//would silently win the range check, so accept numbers and numeric strings only; reject the rest.
function parseConfigCoord(raw: unknown): number | null {
  if (typeof raw === "number") {
    return isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return null;
    }
    const n = Number(trimmed);
    return isFinite(n) ? n : null;
  }
  return null;
}

//Resolve home coordinates. Precedence: (1) config home-latitude / home-longitude, used only when
//BOTH parse finite and in range (lat -90..90, lon -180..180); (2) hass.config.{latitude,longitude}.
//Returns null when neither tier has a usable pair.
//Memoized on config identity with the hass.config pointer checked on read, so a hass update that
//didn't touch coordinates returns the same object reference (identity equality upstream).
interface HomeCoordsCacheEntry {
  hassCfg: unknown;
  result: { lat: number; lon: number } | null;
}
const _homeCoordsCache = new WeakMap<
  SolarOverviewCardConfig,
  HomeCoordsCacheEntry
>();
let _homeCoordsNoConfigCache: HomeCoordsCacheEntry | null = null;

export function getHomeCoords(
  config: SolarOverviewCardConfig | undefined,
  hass: any
): { lat: number; lon: number } | null {
  const hassCfg = hass?.config;

  if (config) {
    const cached = _homeCoordsCache.get(config);
    if (cached && cached.hassCfg === hassCfg) {
      return cached.result;
    }
  } else if (
    _homeCoordsNoConfigCache &&
    _homeCoordsNoConfigCache.hassCfg === hassCfg
  ) {
    return _homeCoordsNoConfigCache.result;
  }

  const result = _resolveHomeCoords(config, hassCfg);
  const entry: HomeCoordsCacheEntry = { hassCfg, result };
  if (config) {
    _homeCoordsCache.set(config, entry);
  } else {
    _homeCoordsNoConfigCache = entry;
  }
  return result;
}

function _resolveHomeCoords(
  config: SolarOverviewCardConfig | undefined,
  hassCfg: any
): { lat: number; lon: number } | null {
  const cfgLat = parseConfigCoord(config?.["home-latitude"]);
  const cfgLon = parseConfigCoord(config?.["home-longitude"]);
  if (
    cfgLat !== null &&
    cfgLon !== null &&
    cfgLat >= -90 &&
    cfgLat <= 90 &&
    cfgLon >= -180 &&
    cfgLon <= 180
  ) {
    return { lat: cfgLat, lon: cfgLon };
  }

  const lat = hassCfg?.latitude;
  const lon = hassCfg?.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }
  return { lat, lon };
}

//Stable signature of the visual config, used to skip updateConfig() when nothing the engine cares
//about changed. WeakMap-cached on config identity to avoid re-allocating the join string per cycle.
const _configSigCache = new WeakMap<SolarOverviewCardConfig, string>();

export function computeConfigSig(
  config: SolarOverviewCardConfig | undefined
): string {
  if (!config) {
    return "";
  }
  const cached = _configSigCache.get(config);
  if (cached !== undefined) {
    return cached;
  }
  const sig = VISUAL_CONFIG_KEYS.map((k) => `${k}=${config[k] ?? ""}`).join(
    "|"
  );
  _configSigCache.set(config, sig);
  return sig;
}

//Document-level visibilitychange listener stored on the host.
export type VisibilityChangeListener = () => void;

//Structural surface the host card exposes to this module. Extends
//OverlaysHost so refreshOverlays(host) lands cleanly inside the
//engine onWeatherUpdate / onMapTransform callbacks; the rest is
//the engine + init lifecycle state the bootstrap mutates.
export interface InitHost extends OverlaysHost {
  readonly config: SolarOverviewCardConfig | undefined;
  readonly hass: any;

  _engine?: SolarOverviewEngine;
  _timeRange: { start: Date; end: Date } | null;
  _isLiveMode: boolean;

  _lastHomeKey: string;
  _initInflight: boolean;
  //performance.now() of the most recent engine spawn, used to throttle respawns when the browser
  //thrashes its WebGL context pool (respawning at that cadence cascades into more losses).
  _lastEngineSpawnAt: number;
  _visibilityObserver?: IntersectionObserver;
  //Stored on the host so disconnectedCallback can removeEventListener cleanly on unmount.
  _onVisibilityChange?: VisibilityChangeListener;

  requestUpdate(): void;
}

//Pause CSS + SVG SMIL animations and the engine's heavy work when the card scrolls out of view OR
//the tab is hidden (Page Visibility API layered on top of IntersectionObserver).
export function initVisibilityObserver(host: InitHost): void {
  if (host._visibilityObserver || typeof IntersectionObserver === "undefined") {
    return;
  }
  let intersecting = true;
  let wasTabHidden = false;
  const applyState = () => {
    const tabHidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    const paused = !intersecting || tabHidden;
    setAnimationsPaused(host, paused);
    host._engine?.setPaused(paused);
    //Tab just became visible: live values may have been cleared to null while hidden (hass
    //disconnect). Invalidate the refresh-gate reference cache so the next render refreshes all chips.
    if (wasTabHidden && !tabHidden) {
      const h = host as unknown as {
        _lastRefreshHassRef?: unknown;
        _lastRefreshConfigRef?: unknown;
        _lastRefreshTimeRangeRef?: unknown;
        _lastRefreshEnergyDefaultsRef?: unknown;
      };
      h._lastRefreshHassRef = undefined;
      h._lastRefreshConfigRef = undefined;
      h._lastRefreshTimeRangeRef = undefined;
      h._lastRefreshEnergyDefaultsRef = undefined;
      host.requestUpdate();
    }
    wasTabHidden = tabHidden;
  };
  host._visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        intersecting = entry.isIntersecting;
      }
      applyState();
    },
    { threshold: 0 }
  );
  host._visibilityObserver.observe(host as unknown as Element);
  if (typeof document !== "undefined") {
    host._onVisibilityChange = applyState;
    document.addEventListener("visibilitychange", host._onVisibilityChange);
  }
}

//Per-card respawn throttle: refuse to respawn within ENGINE_SPAWN_COOLDOWN_MS. Editor preview fires
//setConfig() bursts (10+/s) and each respawn allocates a fresh MapLibre WebGL context; browsers'
//8-16 context slots can't keep up ("too many active WebGL contexts"). 600 ms covers one MapLibre
//teardown + GL slot release while still feeling instant on a single edit.
const ENGINE_SPAWN_COOLDOWN_MS = 600;
const _pendingRespawnTimers = new WeakMap<InitHost, number>();

//Global rate limit across ALL card instances: dashboard edit mode can hold many cards alive and
//their combined startup burst still overruns the WebGL slot pool. Max one fresh engine per 800 ms.
let _globalLastSpawnAt = 0;
const GLOBAL_SPAWN_COOLDOWN_MS = 800;

//Called from disconnectedCallback so a pending deferred respawn can't fire after teardown.
export function cancelPendingRespawn(host: InitHost): void {
  const t = _pendingRespawnTimers.get(host);
  if (t !== undefined) {
    window.clearTimeout(t);
    _pendingRespawnTimers.delete(host);
  }
}

export function initEngine(host: InitHost): void {
  const now = performance.now();
  const lastAt = host._lastEngineSpawnAt ?? 0;
  const delta = now - lastAt;
  const sinceGlobalSpawn = now - _globalLastSpawnAt;
  //Either the per-card cooldown or the global rate limit can force a deferral.
  const needDefer =
    (delta < ENGINE_SPAWN_COOLDOWN_MS && lastAt > 0) ||
    sinceGlobalSpawn < GLOBAL_SPAWN_COOLDOWN_MS;
  if (needDefer) {
    //Coalesce rapid respawns into one deferred spawn; clear any prior pending timer (latest config
    //wins).
    const prev = _pendingRespawnTimers.get(host);
    if (prev !== undefined) {
      window.clearTimeout(prev);
    }
    host._initInflight = true;
    const perCardWait = lastAt > 0 ? ENGINE_SPAWN_COOLDOWN_MS - delta : 0;
    const globalWait = GLOBAL_SPAWN_COOLDOWN_MS - sinceGlobalSpawn;
    const wait = Math.max(perCardWait, globalWait, 0) + 16;
    const t = window.setTimeout(() => {
      _pendingRespawnTimers.delete(host);
      //Bail if the card was unmounted while the cooldown ran.
      const hostEl = host as unknown as { isConnected?: boolean };
      if (hostEl.isConnected === false) {
        host._initInflight = false;
        return;
      }
      initEngineNow(host);
    }, wait);
    _pendingRespawnTimers.set(host, t);
    return;
  }
  host._initInflight = true;
  _globalLastSpawnAt = now;
  initEngineNow(host);
}

//Build the MapLibre engine and wire its callbacks into card state. Replaces any previous engine.
//Bails early if the container or hass.config isn't ready; the caller retries next Lit cycle.
export function initEngineNow(host: InitHost): void {
  requestAnimationFrame(() => {
    //The rAF gap above can land after an edit-mode unmount; don't spawn an engine for a detached card.
    const cardEl = host as unknown as {
      shadowRoot: ShadowRoot | null;
      isConnected: boolean;
    };
    if (!cardEl.isConnected) {
      host._initInflight = false;
      return;
    }
    const container = cardEl.shadowRoot?.getElementById(
      "map-container"
    ) as HTMLElement | null;
    if (!container || !host.config || !host.hass?.config) {
      host._initInflight = false;
      return;
    }
    const coords = getHomeCoords(host.config, host.hass);
    if (!coords) {
      host._initInflight = false;
      return;
    }
    const { lat, lon } = coords;
    //Home altitude (m ASL) from HA settings; may be undefined, in which case the engine omits
    //&elevation= and Open-Meteo falls back to its own DEM.
    const elevation = host.hass.config.elevation;

    const hadPreviousEngine = host._engine !== undefined;
    host._engine?.cleanup();
    host._engine = undefined;
    //Clear anything MapLibre left in the container; a leftover dead canvas would stack a second 3D
    //context on the new one.
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const spawnNewEngine = (): void => {
      //Re-check: the inter-frame gap could land after a disconnect.
      if (!host.config || !host.hass?.config) {
        host._initInflight = false;
        return;
      }
      host._engine = new SolarOverviewEngine(
        container,
        host.config,
        [lon, lat],
        elevation
      );
      host._lastEngineSpawnAt = performance.now();
      wireEngineCallbacks(host);
      //Seed the timeline window from the engine's synthetic fallback so the time-bar renders from
      //the first frame; onWeatherUpdate upgrades it to the real window when weather arrives (which
      //can be delayed / skipped on a slow load).
      if (!host._timeRange) {
        host._timeRange = host._engine.getTimelineRange();
      }
      host._initInflight = false;
    };

    if (hadPreviousEngine) {
      //Firefox releases the WebGL context one frame after loseContext(); allocating the next engine
      //in the same tick can fail to bind and render a black canvas. Skip a frame to let it release.
      requestAnimationFrame(spawnNewEngine);
      return;
    }

    spawnNewEngine();
  });
}

//Wire engine-side callbacks into card state. Shared by both spawn paths. Assumes host._engine is set.
function wireEngineCallbacks(host: InitHost): void {
  if (!host._engine) {
    return;
  }

  //Ping Lit so engine-readiness-gated chrome enables immediately; the
  //engine instance isn't a @state property, so this is Lit's only signal it became truthy.
  host.requestUpdate();

  host._engine.onWeatherUpdate = (data) => {
    host._timeRange = data.timeRange;
    host._isLiveMode = data.isLiveTime;
    //First weather update is the cue for the initial label layout: the map style has loaded and the
    //projection matrix is available. Later transforms refresh via onMapTransform.
    refreshOverlays(host);
  };
  //rAF-coalesced overlay refresh: MapLibre fires 5-10 move events per frame during inertial pans,
  //and each full refresh reprojects the sun arc, home silhouettes and dome. The gate caps it at one
  //pass per frame.
  let overlayRaf: number | null = null;
  host._engine.onMapTransform = () => {
    //Paused (off-screen / hidden tab) still fires move events on tile loads, but nothing is visible.
    if (host._engine?.isPaused()) {
      return;
    }
    if (overlayRaf !== null) {
      return;
    }
    overlayRaf = requestAnimationFrame(() => {
      overlayRaf = null;
      refreshOverlays(host);
    });
  };
  //Does NOT auto-respawn: when the browser kills our context (per-origin 8-16 context cap in editor
  //preview), respawning fires another getContext that kills another context, looping into error
  //spam. Stay paused and let MapLibre's context-restored path (or a manual config edit) recover.
  host._engine.onContextLost = () => {
    /* intentional no-op: do not auto-respawn (see comment above) */
  };
}
