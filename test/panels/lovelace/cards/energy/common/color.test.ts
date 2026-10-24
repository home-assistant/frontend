import { describe, expect, it } from "vitest";
import {
  hex2rgb,
  lab2rgb,
  rgb2hex,
  rgb2lab,
} from "../../../../../../src/common/color/convert-color";
import { labBrighten, labDarken } from "../../../../../../src/common/color/lab";
import { getEnergyColor } from "../../../../../../src/panels/lovelace/cards/energy/common/color";

const createStyles = (vars: Record<string, string> = {}): CSSStyleDeclaration =>
  ({
    getPropertyValue: (name: string) => vars[name] ?? "",
  }) as unknown as CSSStyleDeclaration;

const SOLAR_COLOR = "#ff9800"; // typical theme value for --energy-solar-color

// Muted khaki: stays inside the sRGB gamut after L-shifts and hue rotations,
// so geometry tests measure the algorithm, not gamut clipping.
const GEOMETRY_BASE = "#9c8a55";

const stylesWithBase = (base: string = SOLAR_COLOR) =>
  createStyles({ "--energy-solar-color": base });

/** Lab lightness of a hex color. */
const lightness = (hex: string) => rgb2lab(hex2rgb(stripAlpha(hex)))[0];

/** Chroma (sqrt(a^2 + b^2)) of a hex color. */
const chroma = (hex: string) => {
  const [, a, b] = rgb2lab(hex2rgb(stripAlpha(hex)));
  return Math.hypot(a, b);
};

/** Hue angle in degrees of a hex color. */
const hueDeg = (hex: string) => {
  const [, a, b] = rgb2lab(hex2rgb(stripAlpha(hex)));
  return (Math.atan2(b, a) * 180) / Math.PI;
};

const stripAlpha = (hex: string) => (hex.length === 9 ? hex.slice(0, 7) : hex);

describe("getEnergyColor", () => {
  it("returns the theme color with background alpha", () => {
    const out = getEnergyColor(
      stylesWithBase(),
      false,
      true,
      false,
      "--energy-solar-color"
    );
    expect(out).toBe(SOLAR_COLOR + "7F");
  });

  it("applies compare alpha modifiers", () => {
    const out = getEnergyColor(
      stylesWithBase(),
      false,
      false,
      true,
      "--energy-solar-color"
    );
    expect(out).toBe(SOLAR_COLOR + "7F");
    const outBg = getEnergyColor(
      stylesWithBase(),
      false,
      true,
      true,
      "--energy-solar-color"
    );
    expect(outBg).toBe(SOLAR_COLOR + "32");
  });

  it("prefers an indexed theme color and does not modify it", () => {
    const styles = createStyles({
      "--energy-solar-color": SOLAR_COLOR,
      "--energy-solar-color-4": "#abcdef",
    });
    const out = getEnergyColor(
      styles,
      false,
      true,
      false,
      "--energy-solar-color",
      4
    );
    expect(out).toBe("#abcdef7F");
  });

  describe("legacy lightness stepping (idx 1 and 2)", () => {
    it.each([[1], [2]])("idx %i matches the previous implementation", (idx) => {
      const styles = stylesWithBase();
      for (const darkMode of [false, true]) {
        const expected =
          rgb2hex(
            lab2rgb(
              darkMode
                ? labBrighten(rgb2lab(hex2rgb(SOLAR_COLOR)), idx)
                : labDarken(rgb2lab(hex2rgb(SOLAR_COLOR)), idx)
            )
          ) + "7F";
        const out = getEnergyColor(
          styles,
          darkMode,
          true,
          false,
          "--energy-solar-color",
          idx
        );
        expect(out).toBe(expected);
      }
    });

    it("differs from the base color only in lightness", () => {
      const out = getEnergyColor(
        createStyles({ "--energy-solar-color": GEOMETRY_BASE }),
        true,
        false,
        false,
        "--energy-solar-color",
        1
      );
      // Values survive an 8-bit round-trip, so allow a few degrees / units.
      expect(Math.abs(hueDeg(out) - hueDeg(GEOMETRY_BASE))).toBeLessThan(5);
      expect(Math.abs(chroma(out) - chroma(GEOMETRY_BASE))).toBeLessThan(3);
      expect(lightness(out)).toBeGreaterThan(lightness(GEOMETRY_BASE));
    });
  });

  describe("hue rotation (idx >= 3)", () => {
    it("rotates hue away from the base color", () => {
      const out = getEnergyColor(
        createStyles({ "--energy-solar-color": GEOMETRY_BASE }),
        false,
        false,
        false,
        "--energy-solar-color",
        3
      );
      // Gamut clipping may reduce chroma, but the series must stay visibly
      // colorful and clearly re-hued.
      expect(chroma(out)).toBeGreaterThan(chroma(GEOMETRY_BASE) * 0.5);
      const delta = Math.abs(hueDeg(out) - hueDeg(GEOMETRY_BASE));
      expect(delta).toBeGreaterThan(90);
      expect(delta).toBeLessThan(270);
    });

    it("spaces consecutive rotated series by the golden angle", () => {
      const base = createStyles({ "--energy-solar-color": GEOMETRY_BASE });
      const s3 = getEnergyColor(
        base,
        false,
        false,
        false,
        "--energy-solar-color",
        3
      );
      const s4 = getEnergyColor(
        base,
        false,
        false,
        false,
        "--energy-solar-color",
        4
      );
      // Allow slack for 8-bit quantization and mild gamut clipping.
      const delta = Math.abs(((hueDeg(s4) - hueDeg(s3) + 540) % 360) - 180);
      expect(Math.abs(delta - 137.5)).toBeLessThan(15);
    });

    it("rescues near-grey base colors so rotation is visible", () => {
      const out = getEnergyColor(
        stylesWithBase("#808080"),
        false,
        false,
        false,
        "--energy-solar-color",
        3
      );
      expect(chroma(out)).toBeGreaterThanOrEqual(20);
    });

    it("clamps rotated lightness into the readable band", () => {
      // Very light base in light mode: must not converge to white.
      const out = getEnergyColor(
        stylesWithBase("#f5f5f5"),
        false,
        false,
        false,
        "--energy-solar-color",
        7
      );
      expect(lightness(out)).toBeLessThanOrEqual(75);
      // Very dark base in dark mode: must not converge to black.
      const outDark = getEnergyColor(
        stylesWithBase("#0a0a0a"),
        true,
        false,
        false,
        "--energy-solar-color",
        7
      );
      expect(lightness(outDark)).toBeGreaterThanOrEqual(35);
    });

    it("produces distinct colors for many series", () => {
      const colors = Array.from({ length: 8 }, (_, idx) =>
        getEnergyColor(
          stylesWithBase(),
          false,
          false,
          false,
          "--energy-solar-color",
          idx
        ).replace(/(..)$/, "")
      );
      expect(new Set(colors).size).toBe(colors.length);
    });
  });
});
