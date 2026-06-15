//Solar position and irradiance math: pure functions, no DOM, no map. Validated
//against the NOAA SPA reference (mean altitude error 0.30°, azimuth 0.36°, max ~1°);
//the simplified declination formula is kept deliberately for compactness.

//Sun altitude / azimuth in degrees at a UTC instant for a lat/lon point (azimuth
//clockwise from north). Single-entry cache keyed on timestamp + 6-decimal lat/lon
//absorbs the repeated same-tuple lookups within one Lit render cycle.
let _sunCacheKey: string | null = null;
let _sunCacheValue: { altitude: number; azimuth: number } | null = null;

export function getSunPosition(
  date: Date,
  lat: number,
  lon: number
): { altitude: number; azimuth: number } {
  const key = `${date.getTime()}|${lat.toFixed(6)}|${lon.toFixed(6)}`;
  if (key === _sunCacheKey && _sunCacheValue !== null) {
    return _sunCacheValue;
  }

  const D = Math.PI / 180;
  const H =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  const doy = Math.floor(
    (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000
  );
  const decl = 23.45 * Math.sin(D * (360 / 365) * (doy - 81));
  const B = D * (360 / 365) * (doy - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  //Hour angle normalised to [-180°, 180°] so sign(ha) reliably gives AM/PM; without
  //it, longitudes far from Greenwich yield azimuths off by up to 180° below.
  let ha = 15 * (H + lon / 15 + eot / 60 - 12);
  ha = ((((ha + 180) % 360) + 360) % 360) - 180;

  const sinA =
    Math.sin(D * lat) * Math.sin(D * decl) +
    Math.cos(D * lat) * Math.cos(D * decl) * Math.cos(D * ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinA))) / D;
  const cAlt = Math.cos(alt * D);
  const cAz =
    cAlt > 1e-4
      ? (Math.sin(D * decl) - Math.sin(D * lat) * sinA) /
        (Math.cos(D * lat) * cAlt)
      : 0;
  let az = Math.acos(Math.max(-1, Math.min(1, cAz))) / D;
  if (ha > 0) {
    az = 360 - az;
  }
  const result = { altitude: alt, azimuth: az };
  _sunCacheKey = key;
  _sunCacheValue = result;
  return result;
}

//Photovoltaic power estimate, normalised 0..100 % of STC (1000 W/m²). Pipeline:
//Haurwitz (1945) clear-sky GHI → Kasten-Czeplak (1980) cloud attenuation → optional
//Liu-Jordan isotropic tilt/azimuth transposition (when `panel` is supplied) → clamp.
//Without `panel` it stays horizontal. Single-orientation by design: multi-array
//installs are summed kWp-weighted by the card-layer caller.

//One co-oriented group of panels.
export interface PanelOrientation {
  //0 = horizontal, 90 = vertical. Ignored when `tracker` follows the sun in elevation.
  tiltDeg: number;
  //Compass bearing clockwise from north (180 = south). Ignored when `tracker` follows
  //the sun in azimuth.
  azimuthDeg: number;
  //Sun-tracking. Omitted = fixed panel. 'dual-axis' keeps the normal on the sun;
  //'single-axis-h' tracks tilt only; 'single-axis-v' tracks azimuth only.
  tracker?: "dual-axis" | "single-axis-h" | "single-axis-v";
}

//Optional refinement context; every field opt-in, empty preserves the analytical
//output. `shading` zeroes the direct beam but keeps diffuse +
//ground. `airTempC` / `windMs` are inert, kept only so existing callers compile.
export interface PvComputeContext {
  airTempC?: number;
  windMs?: number;
  shading?: boolean;
  //Measured / forecast GHI (W/m²). When >= 0 it replaces the Haurwitz × Kasten-Czeplak
  //analytical GHI base, inheriting the weather model's own cloud physics.
  ghiWm2?: number;
  //Measured / forecast beam + diffuse on the HORIZONTAL plane (W/m²). When BOTH >= 0
  //they replace the cloud-derived direct/diffuse split in the tilt transposition.
  //Ignored on a horizontal panel and when either is missing.
  directWm2?: number;
  diffuseWm2?: number;
  //Open-Meteo plane-of-array irradiance (W/m²) for this orientation. When >= 0 on a
  //tilted panel it REPLACES the isotropic transposition with the model's anisotropic
  //POA; shading still carves the beam out of it.
  poaWm2?: number;
}

export function computePvPower(
  date: Date,
  lat: number,
  lon: number,
  cloudCoverPct: number,
  panel?: PanelOrientation,
  ctx?: PvComputeContext
): number {
  const sun = getSunPosition(date, lat, lon);
  const alt = sun.altitude;
  if (alt <= 0) {
    return 0;
  }

  const D = Math.PI / 180;
  const cosZ = Math.sin(alt * D);
  const ghiClear = 1098 * cosZ * Math.exp(-0.059 / cosZ);

  const cc = Math.max(0, Math.min(100, cloudCoverPct)) / 100;
  const kCloud = 1 - 0.75 * cc ** 3.4;

  //GHI magnitude: prefer the supplied measured/forecast irradiance, else the analytical
  //base. kCloud is still used below for the direct/diffuse split regardless.
  const ghiEff =
    ctx?.ghiWm2 != null && ctx.ghiWm2 >= 0 ? ctx.ghiWm2 : ghiClear * kCloud;

  let poaEff: number;

  //Horizontal panel (default): GHI already is the plane-of-array irradiance.
  if (!panel || (panel.tiltDeg <= 0 && !panel.tracker)) {
    //A shaded flat panel still sees diffuse + ground; approximate as 25 % of GHI.
    poaEff = ctx?.shading ? ghiEff * 0.25 : ghiEff;
  } else {
    //Tilted panel: project the direct beam onto the panel normal, add isotropic-sky
    //diffuse and a ground-reflected term. Trackers override tilt and/or azimuth to
    //keep the normal on the sun on their free axis.
    let beta_deg = panel.tiltDeg;
    let az_deg = panel.azimuthDeg;
    if (panel.tracker === "dual-axis") {
      //Normal on the sun: tilt = complement of altitude, azimuth straight on the sun.
      beta_deg = 90 - alt;
      az_deg = sun.azimuth;
    } else if (panel.tracker === "single-axis-h") {
      //Horizontal-axis: only elevation adjusts, azimuth stays configured.
      beta_deg = 90 - alt;
    } else if (panel.tracker === "single-axis-v") {
      //Vertical-axis: azimuth tracks the sun, tilt stays configured.
      az_deg = sun.azimuth;
    }
    const beta = beta_deg * D;
    const dAz = (sun.azimuth - az_deg) * D;
    const altR = alt * D;

    const cosTheta =
      Math.sin(altR) * Math.cos(beta) +
      Math.cos(altR) * Math.sin(beta) * Math.cos(dAz);

    //Beam transposition ratio R_b = cos(θi) / cos(zenith), denominator clamped at
    //sin(5°) so it doesn't blow up at sunrise/sunset.
    const rb = cosTheta > 0 ? Math.max(0, cosTheta) / Math.max(0.087, cosZ) : 0;

    //Direct/diffuse split drives the transposition gain. Prefer the measured/forecast
    //decomposition when BOTH are supplied (real beam fraction), else the cloud-derived
    //fraction.
    const hasSplit =
      ctx?.directWm2 != null &&
      ctx.directWm2 >= 0 &&
      ctx?.diffuseWm2 != null &&
      ctx.diffuseWm2 >= 0 &&
      ctx.directWm2 + ctx.diffuseWm2 > 0;

    let directFraction: number;
    if (hasSplit) {
      directFraction = ctx!.directWm2! / (ctx!.directWm2! + ctx!.diffuseWm2!);
    } else {
      //Map kCloud ~0.25..1.0 to a direct fraction of 0..0.85. Loose stand-in for a
      //clearness-index decomposition, good enough at hourly resolution.
      directFraction = Math.max(
        0,
        Math.min(0.85, ((kCloud - 0.25) / 0.75) * 0.85)
      );
    }
    const diffuseFraction = 1 - directFraction;

    //Shading: an obstacle blocks the direct beam; diffuse + ground still reach the panel.
    const directPoa = ctx?.shading ? 0 : ghiEff * directFraction * rb;
    const diffusePoa = (ghiEff * diffuseFraction * (1 + Math.cos(beta))) / 2;
    const groundPoa = (ghiEff * 0.2 * (1 - Math.cos(beta))) / 2;

    //Open-Meteo GTI, when available, replaces the isotropic transposition. Shading
    //carves the beam out (GTI is the total POA, so keep only diffuse + ground).
    if (ctx?.poaWm2 != null && ctx.poaWm2 >= 0) {
      if (ctx.shading) {
        const skyGround = Math.min(ctx.poaWm2, diffusePoa + groundPoa);
        poaEff = skyGround;
      } else {
        poaEff = ctx.poaWm2;
      }
    } else {
      poaEff = directPoa + diffusePoa + groundPoa;
    }
  }

  //Normalise the POA against STC (1000 W/m²) and clamp to 0-100 %.
  const pStc = Math.max(0, poaEff / 1000);

  return Math.max(0, Math.min(100, pStc * 100));
}

//Same physics as computePvPower but returns the effective ground-horizontal
//irradiance in W/m² (not the clamped 0-100 %). 0 below the horizon doubles as a
//"night" sentinel for the solar-arc visualisation.
export function computeIrradianceWm2(
  date: Date,
  lat: number,
  lon: number,
  cloudCoverPct: number
): number {
  const sun = getSunPosition(date, lat, lon);
  const alt = sun.altitude;
  if (alt <= 0) {
    return 0;
  }

  const D = Math.PI / 180;
  const cosZ = Math.sin(alt * D);
  const ghiClear = 1098 * cosZ * Math.exp(-0.059 / cosZ);

  const cc = Math.max(0, Math.min(100, cloudCoverPct)) / 100;
  const kCloud = 1 - 0.75 * cc ** 3.4;

  return Math.max(0, ghiClear * kCloud);
}
