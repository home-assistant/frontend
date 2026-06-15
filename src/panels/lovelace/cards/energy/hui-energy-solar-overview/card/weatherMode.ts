//Weather overlay mode. Toggling the weather chip fades the HUD out, tilts the camera top-down, and
//paints modelled cloud cover as three altitude bands (low / mid / high) via a fragment-shader
//MapLibre layer (see src/engine/weather-cloud-layer.ts), with growing per-band opacity.
//Lifecycle: enter tilts + loads the grid + mounts the layer; exit removes the layer + stops the
//refresh timer + restores the camera; timeline scrubs call refreshCloudShaderTime() (re-uploads the
//hour's data texture, no network); the three rail buttons drive setCloudShaderBands().
//The data feed is cached in localStorage for 30 min, dedup-guarded and abortable.

import { refreshOverlays, type OverlaysHost } from "./overlays";
import type { SolarOverviewEngine } from "../hui-energy-solar-overview-engine";

export type CardMode = "base" | "weather";

//Enter ramps the overlay in over 600 ms while the HUD fades out; exit ramps out in 280 ms.
const WEATHER_FADE_IN_MS = 600;
const WEATHER_FADE_OUT_MS = 280;
//Mount the cloud shader layer this long after enter, i.e. near the tail of the engine's
//1200 ms dezoom ease, so it never flickers on the still-moving top edge mid-animation.
const CLOUD_LAYER_MOUNT_AFTER_MS = 950;

export interface WeatherModeHost extends OverlaysHost {
  readonly _engine?: SolarOverviewEngine;
  _cardMode: CardMode;
  _overlayMaskActive: boolean;
  _weatherOverlayVisible: boolean;
  _weatherFadeInStartMs: number | null;
  _weatherFadeOutStartMs: number | null;
  _weatherFadeRaf?: number;
  _selectedTime: Date | null;
  _isLiveMode: boolean;
  //Per-band visibility flags from the three rail buttons; reset to all true on every entry.
  _weatherShowHigh: boolean;
  _weatherShowMid: boolean;
  _weatherShowLow: boolean;
  //Last time index pushed into the shader; short-circuits duplicate scrub updates.
  _weatherShownTimeIdx?: number;
  requestUpdate(): void;
}

//The card root (an HTMLElement) is the source of the `--primary-text-color` the shader reads; cast
//through the host so the engine surface stays free of Lit-specific typing.
function getCssHost(host: WeatherModeHost): HTMLElement | null {
  return (host as unknown as HTMLElement | null) ?? null;
}

//Tilt the camera, fetch the cloud grid, mount the shader layer when it lands. Per-band toggles reset
//to all-true.
export function enterWeatherMode(host: WeatherModeHost): boolean {
  if (!host._engine) {
    return false;
  }
  host._weatherFadeOutStartMs = null;
  host._weatherFadeInStartMs = performance.now();
  host._weatherOverlayVisible = true;
  host._weatherShowHigh = true;
  host._weatherShowMid = true;
  host._weatherShowLow = true;
  host._weatherShownTimeIdx = undefined;
  const enterStartMs = performance.now();
  host._engine.enterWeatherCamera();
  void host._engine.ensureWeatherCloudGrid().then(() => {
    if (host._weatherFadeOutStartMs !== null) {
      return;
    }
    if (!host._weatherOverlayVisible) {
      return;
    }
    //Mount the shader layer at the tail of the dezoom, not mid-animation: a layer
    //appearing while the camera still sweeps flickers on the moving top edge. By
    //the time it lands the camera has all but settled, so it reads as a clean
    //fade-in near the end of the ease. If the grid fetch itself outlasts the ease,
    //the delay collapses to 0 and it mounts immediately.
    const elapsed = performance.now() - enterStartMs;
    const delay = Math.max(0, CLOUD_LAYER_MOUNT_AFTER_MS - elapsed);
    window.setTimeout(() => {
      if (
        host._weatherFadeOutStartMs !== null ||
        !host._weatherOverlayVisible
      ) {
        return;
      }
      const engine = host._engine;
      if (!engine) {
        return;
      }
      engine.startWeatherCloudRefresh();
      const cssHost = getCssHost(host);
      const activeTime =
        host._isLiveMode || !host._selectedTime
          ? new Date()
          : host._selectedTime;
      const timeIdx = engine.getWeatherCloudGridTimeIndex(activeTime);
      const bands: [boolean, boolean, boolean] = [
        host._weatherShowLow,
        host._weatherShowMid,
        host._weatherShowHigh,
      ];
      engine.addCloudShaderLayer(cssHost, bands, timeIdx >= 0 ? timeIdx : 0);
      host._weatherShownTimeIdx = timeIdx >= 0 ? timeIdx : 0;
      host.requestUpdate();
    }, delay);
  });
  refreshOverlays(host);
  startWeatherFadeLoop(host);
  return true;
}

//Tear down: start the HUD fade-in, drop the shader layer, hand the camera back, stop the timer.
export function exitWeatherMode(host: WeatherModeHost): void {
  host._weatherFadeInStartMs = null;
  host._weatherFadeOutStartMs = performance.now();
  host._engine?.removeCloudShaderLayer();
  host._engine?.exitWeatherCamera();
  host._engine?.stopWeatherCloudRefresh();
  host._weatherShownTimeIdx = undefined;
  startWeatherFadeLoop(host);
}

export function startWeatherFadeLoop(host: WeatherModeHost): void {
  if (host._weatherFadeRaf !== undefined) {
    return;
  }
  const tick = (): void => {
    const now = performance.now();
    const inStart = host._weatherFadeInStartMs;
    const outStart = host._weatherFadeOutStartMs;

    if (outStart !== null && now - outStart >= WEATHER_FADE_OUT_MS) {
      host._weatherFadeOutStartMs = null;
      host._weatherOverlayVisible = false;
      refreshOverlays(host);
    }
    if (inStart !== null && now - inStart >= WEATHER_FADE_IN_MS) {
      host._weatherFadeInStartMs = null;
    }
    host.requestUpdate();
    if (
      host._weatherFadeInStartMs !== null ||
      host._weatherFadeOutStartMs !== null
    ) {
      host._weatherFadeRaf = requestAnimationFrame(tick);
    } else {
      host._weatherFadeRaf = undefined;
    }
  };
  host._weatherFadeRaf = requestAnimationFrame(tick);
}

export function weatherFadeAlpha(host: WeatherModeHost): number {
  const now = performance.now();
  if (host._weatherFadeInStartMs !== null) {
    return Math.max(
      0,
      Math.min(1, (now - host._weatherFadeInStartMs) / WEATHER_FADE_IN_MS)
    );
  }
  if (host._weatherFadeOutStartMs !== null) {
    return (
      1 -
      Math.max(
        0,
        Math.min(1, (now - host._weatherFadeOutStartMs) / WEATHER_FADE_OUT_MS)
      )
    );
  }
  return host._weatherOverlayVisible ? 1 : 0;
}

//Push band-visibility / time-index changes into the engine without a Lit re-render path. Called
//from updated() on every card cycle.
export function syncWeatherShaderState(host: WeatherModeHost): void {
  const engine = host._engine;
  if (!engine) {
    return;
  }
  if (host._cardMode !== "weather") {
    return;
  }
  engine.setCloudShaderBands([
    host._weatherShowLow,
    host._weatherShowMid,
    host._weatherShowHigh,
  ]);
  const activeTime =
    host._isLiveMode || !host._selectedTime ? new Date() : host._selectedTime;
  const timeIdx = engine.getWeatherCloudGridTimeIndex(activeTime);
  if (timeIdx >= 0 && timeIdx !== host._weatherShownTimeIdx) {
    engine.refreshCloudShaderTime(timeIdx);
    host._weatherShownTimeIdx = timeIdx;
  }
}
