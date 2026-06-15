//Screen-space overlay subsystem: pulls fresh projections from the engine, maps sun-arc samples into
//stroke-ready segments, controls the SMIL animation play-state, and exposes the flow-duration easing.

import type { SolarOverviewEngine } from "../hui-energy-solar-overview-engine";

//One arc sample from engine.projectSunScene(). (x, y) place it; nearness / belowHorizon modulate it.
export interface SunArcSample {
  x: number;
  y: number;
  irradiance: number;
  nearness: number;
  belowHorizon: boolean;
}

//Full sun-scene projection. sunrise / sunset are null when the selected day has none (polar).
export interface SunScene {
  arc: SunArcSample[];
  sun: {
    x: number;
    y: number;
    irradiance: number;
    altitude: number;
    nearness: number;
  };
  home: { x: number; y: number };
  daylight: number;
  sunrise: { x: number; y: number; angleRad: number; time: Date } | null;
  sunset: { x: number; y: number; angleRad: number; time: Date } | null;
}

//Screen-space silhouette of one home building: projected base ring + top ring. Painted into the
//cloud-dome SVG mask so the union covers the exact extruded prism even for concave footprints.
export interface HomeSilhouette {
  base: { x: number; y: number }[];
  top: { x: number; y: number }[];
}

//Screen-space anchor positions for the always-visible chips and the leader-line home.
export interface LabelLayout {
  pvLabel: { x: number; y: number };
  batterySocLabel: { x: number; y: number };
  batteryPowerLabel: { x: number; y: number };
  gridLabel: { x: number; y: number };
  lowCarbonLabel: { x: number; y: number };
  home: { x: number; y: number };
  //Ground anchor the floating-pill leader drops to (`home` is lifted a few metres up).
  homeBase: { x: number; y: number };
  //Home roof top; the drop leader lands here so it follows the roof under resize / pitch.
  homeRoof: { x: number; y: number };
  //Perspective-projected ground disc around the home; pulses with bead arrival.
  homeAnchorPoints: string;
}

//A pair of arc samples mapped to a stroke-ready segment. Depth comes from `nearness` (stroke width)
//and `belowHorizon` (night-dot mode).
export interface ArcSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  nearness: number;
  belowHorizon: boolean;
}

export interface OverlaysHost {
  readonly _engine?: SolarOverviewEngine;
  readonly _selectedTime: Date | null;
  readonly _now: Date;

  _labelLayout: LabelLayout | null;
  _sunScene: SunScene | null;
  _homeSilhouettes: HomeSilhouette[];

  readonly shadowRoot: ShadowRoot | null;
  readonly classList: DOMTokenList;
}

//Sub-pixel epsilon for screen-space equality: below this the eye can't tell and Lit shouldn't
//re-render, above it would skip true motion frames.
const EQ_EPS_PX = 0.25;

function nearlyEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= EQ_EPS_PX;
}

function pointEq(
  a: { x: number; y: number } | null | undefined,
  b: { x: number; y: number } | null | undefined
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return nearlyEq(a.x, b.x) && nearlyEq(a.y, b.y);
}

function pointArrayEq(
  a: { x: number; y: number }[],
  b: { x: number; y: number }[]
): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!nearlyEq(a[i].x, b[i].x) || !nearlyEq(a[i].y, b[i].y)) {
      return false;
    }
  }
  return true;
}

function labelLayoutEq(a: LabelLayout | null, b: LabelLayout | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    pointEq(a.pvLabel, b.pvLabel) &&
    pointEq(a.batterySocLabel, b.batterySocLabel) &&
    pointEq(a.batteryPowerLabel, b.batteryPowerLabel) &&
    pointEq(a.gridLabel, b.gridLabel) &&
    pointEq(a.lowCarbonLabel, b.lowCarbonLabel) &&
    pointEq(a.home, b.home) &&
    //homeAnchorPoints is a long SVG points string; string equality captures every vertex delta.
    a.homeAnchorPoints === b.homeAnchorPoints
  );
}

function sunSceneEq(a: SunScene | null, b: SunScene | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (!nearlyEq(a.daylight, b.daylight)) {
    return false;
  }
  if (!pointEq(a.home, b.home)) {
    return false;
  }
  if (
    !nearlyEq(a.sun.x, b.sun.x) ||
    !nearlyEq(a.sun.y, b.sun.y) ||
    !nearlyEq(a.sun.altitude, b.sun.altitude)
  ) {
    return false;
  }
  if (a.arc.length !== b.arc.length) {
    return false;
  }
  for (let i = 0; i < a.arc.length; i++) {
    const sa = a.arc[i];
    const sb = b.arc[i];
    if (sa.belowHorizon !== sb.belowHorizon) {
      return false;
    }
    if (!nearlyEq(sa.x, sb.x) || !nearlyEq(sa.y, sb.y)) {
      return false;
    }
  }
  //Sunrise / sunset markers must match presence and screen position.
  if ((a.sunrise === null) !== (b.sunrise === null)) {
    return false;
  }
  if (
    a.sunrise &&
    b.sunrise &&
    (!nearlyEq(a.sunrise.x, b.sunrise.x) || !nearlyEq(a.sunrise.y, b.sunrise.y))
  ) {
    return false;
  }
  if ((a.sunset === null) !== (b.sunset === null)) {
    return false;
  }
  if (
    a.sunset &&
    b.sunset &&
    (!nearlyEq(a.sunset.x, b.sunset.x) || !nearlyEq(a.sunset.y, b.sunset.y))
  ) {
    return false;
  }
  return true;
}

function homeSilhouettesEq(a: HomeSilhouette[], b: HomeSilhouette[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!pointArrayEq(a[i].base, b[i].base)) {
      return false;
    }
    if (!pointArrayEq(a[i].top, b[i].top)) {
      return false;
    }
  }
  return true;
}

//Pull fresh screen-space layouts from the engine and stash them on the host. Called on every map
//transform, at first weather update, and on each live-mode clock tick.
//Each assignment is gated by a shallow equality check: Lit's identity dirty-check would otherwise
//re-render the template on a fresh-identity-but-equal value. The template's three SMIL
//<animateMotion> paths rebuild from these fields, and Safari re-arms the SMIL clock on every path
//mutation, so without the guards a continuous drag (up to 120 Hz) blew the frame budget.
export function refreshOverlays(host: OverlaysHost): void {
  const nextLabel = host._engine?.projectHomeLabelLayout() ?? null;
  if (!labelLayoutEq(host._labelLayout, nextLabel)) {
    host._labelLayout = nextLabel;
  }

  const t = host._selectedTime ?? host._now;
  const nextSun = host._engine ? host._engine.projectSunScene(t) : null;
  const nextHomes = host._engine ? host._engine.projectHomeFootprints() : [];
  if (!sunSceneEq(host._sunScene, nextSun)) {
    host._sunScene = nextSun;
  }
  if (!homeSilhouettesEq(host._homeSilhouettes, nextHomes)) {
    host._homeSilhouettes = nextHomes;
  }

  //Weather layers are MapLibre custom layers owned by the engine, so they need no
  //per-transform JS projection here.
}

//Pause / resume CSS + SMIL animations. Toggles a .paused class for the CSS side and calls
//(un)pauseAnimations() on every SVG root for the SMIL side (no-ops where unsupported).
export function setAnimationsPaused(host: OverlaysHost, paused: boolean): void {
  host.classList.toggle("paused", paused);
  const root = host.shadowRoot;
  if (!root) {
    return;
  }
  const svgs = root.querySelectorAll("svg");
  for (const svg of svgs) {
    const s = svg as SVGSVGElement & {
      pauseAnimations?: () => void;
      unpauseAnimations?: () => void;
    };
    try {
      if (paused) {
        s.pauseAnimations?.();
      } else {
        s.unpauseAnimations?.();
      }
    } catch (_) {
      /* best-effort: SMIL pause/unpause */
    }
  }
}

//Map an arc-sample sequence into stroke-ready segments (one <line> each, width scaled by `nearness`).
export function buildArcSegments(
  arc: readonly SunArcSample[],
  sunColor: string
): ArcSegment[] {
  const out: ArcSegment[] = [];
  for (let i = 0; i < arc.length - 1; i++) {
    const a = arc[i];
    const b = arc[i + 1];
    out.push({
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      color: sunColor,
      nearness: 0.5 * (a.nearness + b.nearness),
      belowHorizon: a.belowHorizon || b.belowHorizon,
    });
  }
  return out;
}

//Map a rate magnitude to an animation duration (s): rate <= 0 -> 30 s (night), rate = saturation ->
//minDuration. Ease-out cubic ramp; minDuration is per-channel so the long sun ray can flow slower
//than the short PV leader.
export function flowDuration(
  rate: number,
  saturation: number,
  minDuration = 0.4
): number {
  if (!isFinite(rate) || rate <= 0) {
    return 30;
  }
  //Inline cubic instead of Math.pow(.., 3): this fires per bead-duration recompute on each frame.
  const f = Math.min(1, rate / saturation);
  const oneMinusF = 1 - f;
  const eased = 1 - oneMinusF * oneMinusF * oneMinusF;
  return 30 - (30 - minDuration) * eased;
}
