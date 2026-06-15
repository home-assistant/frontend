//Card-level tunables: config schema, defaults, geometry, timeline and timing constants.

//Card config passed to setConfig(). All visual tunables are hardcoded to the DEFAULT_* constants
//below, so the only honoured keys are `title` (set by the energy strategy, read via the index
//signature) and the optional home-location override. Every key is optional and typed unknown.
export interface SolarOverviewCardConfig {
  //Index signature lets the strategy's `title` and any legacy YAML key pass through.
  [key: string]: unknown;
  //Home location override. Used only when BOTH parse as finite, in-range numbers (lat -90..90, lon
  //-180..180); otherwise falls back to hass.config.{latitude, longitude}.
  "home-latitude"?: unknown;
  "home-longitude"?: unknown;
}

//Sun identity (arc + ray + disc) uses HA amber so it stays distinct from the PV production orange.
export const DEFAULT_SUN_COLOR_HEX = "#ffc107"; //--amber-color
export const DEFAULT_CLOUD_COLOR_HEX = "#727272"; //--secondary-text-color (neutral)
export const DEFAULT_BUILDING_COLOR_HEX = "#cccccc"; //HA neutral-80 from the frontend palette (src/resources/theme/color)

//Global display radius (m) for buildings + raster shadows; bounds every layer.
export const DEFAULT_DISPLAY_RADIUS_M = 200;
//Fade band width, measured INWARD from DEFAULT_DISPLAY_RADIUS_M.
export const DISPLAY_FADE_DELTA_M = 50;
export const DEFAULT_BUILDING_OPACITY = 0.25;
//Buildings within this radius (m) of the home, or containing the home point, render at full opacity
//as part of the house, so attached outbuildings join the home group.
export const DEFAULT_BUILDING_CLUSTER_RADIUS_M = 10;
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
