//Day-night colour and lighting math: pure functions of sun altitude (and a base
//building colour), keeping the phase transitions co-located. The engine applies the
//results to MapLibre paint properties and the directional light.

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

//Linear interpolation between two #rrggbb hex strings.
function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const ar = (pa >> 16) & 0xff;
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const ag = (pa >> 8) & 0xff;
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const ab = pa & 0xff;
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const br = (pb >> 16) & 0xff;
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const bg = (pb >> 8) & 0xff;
  // eslint-disable-next-line no-bitwise -- rgb byte unpacking
  const bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b2.toString(16).padStart(2, "0")
  );
}

//Night-shade overlay (colour + opacity) for a sun altitude. Opacity ramps 0 (daylight)
//to ~0.68 (deep night), with a warm amber pass through the sunrise/sunset window.
export function nightShadeForAltitude(altitudeDeg: number): {
  color: string;
  opacity: number;
} {
  if (altitudeDeg < -12) {
    //Astronomical night
    return { color: "#02040c", opacity: 0.68 };
  }
  if (altitudeDeg < -6) {
    //Nautical twilight → astronomical
    const u = (-altitudeDeg - 6) / 6;
    return { color: "#040824", opacity: lerp(0.5, 0.68, u) };
  }
  if (altitudeDeg < 0) {
    //Civil twilight, deep blue
    const u = (altitudeDeg + 6) / 6;
    return { color: "#0a1240", opacity: lerp(0.5, 0.3, u) };
  }
  if (altitudeDeg < 6) {
    //Sunrise/sunset, warm amber wash
    const u = altitudeDeg / 6;
    return { color: "#3a1408", opacity: lerp(0.3, 0.1, u) };
  }
  if (altitudeDeg < 20) {
    //Low sun, fading wash
    const u = (altitudeDeg - 6) / 14;
    return { color: "#3a1408", opacity: lerp(0.1, 0.0, u) };
  }
  //Full daylight, overlay invisible
  return { color: "#000000", opacity: 0 };
}

//Building extrusion colour modulated by sun altitude: blends the base hue toward dark
//ink at night and a warm tint around sunrise/sunset.
export function buildingColorForAltitude(
  baseHex: string,
  altitudeDeg: number
): string {
  if (altitudeDeg < -6) {
    //Deep night, buildings as dark indigo silhouettes
    return lerpHex(baseHex, "#0a0e1a", 0.85);
  }
  if (altitudeDeg < 0) {
    //Civil twilight, fade in/out of night
    const u = (altitudeDeg + 6) / 6;
    const dark = lerpHex(baseHex, "#0a0e1a", 0.85);
    const dusk = lerpHex(baseHex, "#2a2540", 0.55);
    return lerpHex(dark, dusk, u);
  }
  if (altitudeDeg < 6) {
    //Sunrise/sunset, warm wash
    const u = altitudeDeg / 6;
    const dusk = lerpHex(baseHex, "#2a2540", 0.55);
    const warm = lerpHex(baseHex, "#5a3220", 0.35);
    return lerpHex(dusk, warm, u);
  }
  if (altitudeDeg < 20) {
    //Low sun, fade warm tint back to base
    const u = (altitudeDeg - 6) / 14;
    const warm = lerpHex(baseHex, "#5a3220", 0.35);
    return lerpHex(warm, baseHex, u);
  }
  //Full daylight, exact user-defined colour
  return baseHex;
}

//Polar angle (0..89 deg) for MapLibre's directional light (0 = overhead, 90 = horizon)
//from a sun altitude. Clamped at 89 so twilight face shading never lights from below.
export function sunLightPolarFromAltitude(altitudeDeg: number): number {
  return altitudeDeg > 0 ? Math.max(0, Math.min(89, 90 - altitudeDeg)) : 89;
}
