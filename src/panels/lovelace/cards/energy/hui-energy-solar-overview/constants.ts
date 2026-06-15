//Card-level tunables: config schema, defaults, geometry, timeline and timing constants.

//User-facing config passed to setConfig(), read by the engine and editor. Every key is optional and
//typed unknown; callers must validate / coerce before use. DEFAULT_* below supply absent values.
export interface SolarOverviewCardConfig {
  //Index signature lets legacy YAML with retired keys pass through without widening errors.
  [key: string]: unknown;
  //When false, all OpenFreeMap label layers are hidden. Default true.
  "show-labels"?: unknown;
  //OpenFreeMap base style: 'streets' (Liberty) or 'minimal' (Positron). Dark HA theme auto-selects
  //the Fiord dark style.
  "map-style"?: unknown;
  //Camera pose pinned at engine init, degrees. pitch 15..85, bearing 0..359. Drag-rotate / pitch
  //still allowed at runtime unless camera-locked.
  "camera-pitch-deg"?: unknown;
  "camera-bearing-deg"?: unknown;
  //When true, drag-rotate, drag-pitch and idle auto-orbit are all disabled. Default false.
  "camera-locked"?: unknown;
  //Display radius (m) for buildings + raster shadows. Clamped [50, 500], default 200. Primary perf
  //lever on older phones.
  "display-radius"?: unknown;
  //Opacity 0..1 of surrounding buildings; home stays at 1.0. Default 0.25.
  "building-opacity"?: unknown;
  //Cluster radius (m): buildings within it (or containing the home point) render at full opacity as
  //part of the home. Default 0.
  "building-cluster-radius"?: unknown;
  "shadows-enabled"?: unknown;
  "shadow-opacity"?: unknown;
  //Home location override. Used only when BOTH parse as finite, in-range numbers (lat -90..90, lon
  //-180..180); otherwise falls back to hass.config.{latitude, longitude}.
  "home-latitude"?: unknown;
  "home-longitude"?: unknown;
}

//Sun identity (arc + ray + disc) uses HA amber so it stays distinct from the PV production orange.
export const DEFAULT_SUN_COLOR_HEX = "#ffc107"; //--amber-color
export const DEFAULT_CLOUD_COLOR_HEX = "#727272"; //--secondary-text-color (neutral)
//PV / battery / grid colours are not duplicated here; their use sites read the HA Energy palette
//directly via var(--energy-*-color, #fallback).

export const DEFAULT_DISPLAY_RADIUS_M = 200;
export const MIN_DISPLAY_RADIUS_M = 50;
export const MAX_DISPLAY_RADIUS_M = 500;
//Fade band width, measured INWARD from DEFAULT_DISPLAY_RADIUS_M.
export const DISPLAY_FADE_DELTA_M = 50;
export const DEFAULT_BUILDING_OPACITY = 0.25;
export const DEFAULT_BUILDING_CLUSTER_RADIUS_M = 0;
export const DEFAULT_BUILDING_COLOR_HEX = "#d2d2d7";

//Resolve the display radius (m) from `display-radius`, clamped to [MIN, MAX], default DEFAULT.
export function displayRadiusM(
  config: SolarOverviewCardConfig | undefined
): number {
  const raw = config?.["display-radius"];
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? parseFloat(raw)
        : NaN;
  if (!Number.isFinite(n)) {
    return DEFAULT_DISPLAY_RADIUS_M;
  }
  const r = Math.round(n);
  if (r < MIN_DISPLAY_RADIUS_M) {
    return MIN_DISPLAY_RADIUS_M;
  }
  if (r > MAX_DISPLAY_RADIUS_M) {
    return MAX_DISPLAY_RADIUS_M;
  }
  return r;
}

export const DEFAULT_SHADOW_OPACITY = 0.32;

//Decimal places every value readout prints (kW / kWh). Fixed; no config override.
export const VALUE_DECIMALS = 1;

//Geometry: sun disc, loop segments and home pill (screen-space, px).
//Depth-modulation bounds: FAR (back of the day's loop) and NEAR (front), interpolated by the
//engine's nearness factor in [0..1].
export const OUTLINE_FAR = 1.5;
export const OUTLINE_NEAR = 5.0;
export const SEGMENT_FAR = 1.0;
export const SEGMENT_NEAR = 4.0;

export const SUN_R_FAR = 10.0;
export const SUN_R_NEAR = 20.0;
export const SUN_RIM_WIDTH = 1.5;

//Faint tint so the "empty sun" at sunrise/sunset still reads as a disc.
export const SUN_FILL_OPACITY_BG = 0.2;

//Below-horizon segments are dots whose diameter IS the stroke width; scaled down vs daytime.
export const NIGHT_STROKE_FACTOR = 0.5;

//Leader-dock half-extents for the home pill, now a horizontal stadium chip like the others.
//Half-height = pill height (26 px) / 2 + 1 px so leaders dock just outside the top/bottom edge;
//half-width is the nominal min-width (76 px) / 2. Leaders dock to this stadium outline.
export const HOME_PILL_HALF_HEIGHT_PX = 14;
export const HOME_PILL_HALF_WIDTH_PX = 38;

//Timeline: max axis ticks; the list is thinned by stride to stay under this cap.
export const TIMELINE_MAX_TICKS = 7;

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

//Camera pitch bounds (MapLibre min/maxPitch, drag-rotate, initial-pose clamp). MIN = mostly
//top-down, MAX = grazing ground angle, REST = default.
export const CAMERA_PITCH_MIN_DEG = 15;
export const CAMERA_PITCH_MAX_DEG = 55;
export const CAMERA_PITCH_REST_DEG = 50;

//Camera look-target height (m) above the home on the ground->home vertical line.
//The camera frames this point instead of the ground, freeing vertical room above
//the house for the sun arc + chip cluster. Applied as MapLibre top padding sized
//to this height's on-screen projection; collapses to ~0 at top-down pitch.
export const CAMERA_TARGET_HEIGHT_M = 10;
