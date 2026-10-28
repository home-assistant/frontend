import { describe, expect, it } from "vitest";
import {
  hex2rgb,
  rgb2lab,
} from "../../../../../../src/common/color/convert-color";
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

  describe("fallback for multiple sources", () => {
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

    it("keeps hues within the family band", () => {
      const styles = createStyles({ "--energy-solar-color": GEOMETRY_BASE });
      for (let idx = 1; idx <= 8; idx++) {
        const out = getEnergyColor(
          styles,
          false,
          false,
          false,
          "--energy-solar-color",
          idx
        );
        expect(
          Math.abs(hueDeg(out) - hueDeg(GEOMETRY_BASE))
        ).toBeLessThanOrEqual(47);
      }
    });

    it("shifts hue and lightness from the first extra series", () => {
      const styles = createStyles({ "--energy-solar-color": GEOMETRY_BASE });
      const out = getEnergyColor(
        styles,
        false,
        false,
        false,
        "--energy-solar-color",
        1
      );
      expect(Math.abs(hueDeg(out) - hueDeg(GEOMETRY_BASE))).toBeGreaterThan(5);
      expect(
        Math.abs(lightness(out) - lightness(GEOMETRY_BASE))
      ).toBeGreaterThan(2);
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
        )
      );
      expect(new Set(colors).size).toBe(colors.length);
    });
  });
});
