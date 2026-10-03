import { describe, expect, it } from "vitest";
import { deepEqual } from "../../../src/common/util/deep-equal";
import { stripDefaults } from "../../../src/common/util/strip-defaults";

describe("stripDefaults", () => {
  describe("without a defaults map (default is false)", () => {
    it("removes keys whose value is false", () => {
      expect(stripDefaults({ a: 1, b: false })).toEqual({ a: 1 });
    });

    it("removes keys whose value is undefined", () => {
      expect(stripDefaults({ a: 1, b: undefined })).toEqual({ a: 1 });
    });

    it("keeps other falsy values (0, empty string, null)", () => {
      expect(stripDefaults({ a: 0, b: "", c: null })).toEqual({
        a: 0,
        b: "",
        c: null,
      });
    });

    it("keeps true and non-empty values", () => {
      const obj = { a: true, b: "x", c: { d: 1 }, e: [1, 2] };
      expect(stripDefaults(obj)).toEqual(obj);
    });

    it("does not recurse into nested objects", () => {
      expect(stripDefaults({ a: { b: false } })).toEqual({ a: { b: false } });
    });

    it("returns non-plain-object values unchanged", () => {
      expect(stripDefaults(undefined)).toBe(undefined);
      expect(stripDefaults(null)).toBe(null);
      expect(stripDefaults(5)).toBe(5);
      expect(stripDefaults("x")).toBe("x");
      const arr = [1, false, undefined];
      expect(stripDefaults(arr)).toBe(arr);
    });
  });

  describe("with a defaults map", () => {
    it("drops a key that equals its default (default true)", () => {
      expect(stripDefaults({ show_name: true }, { show_name: true })).toEqual(
        {}
      );
    });

    it("keeps a default-true key set to false (a real change)", () => {
      expect(stripDefaults({ show_name: false }, { show_name: true })).toEqual({
        show_name: false,
      });
    });

    it("drops a non-boolean key that equals its default", () => {
      expect(
        stripDefaults(
          { features_position: "bottom" },
          { features_position: "bottom" }
        )
      ).toEqual({});
    });

    it("keeps a non-boolean key that differs from its default", () => {
      expect(
        stripDefaults(
          { features_position: "inline" },
          { features_position: "bottom" }
        )
      ).toEqual({ features_position: "inline" });
    });

    it("still drops false for keys absent from the map", () => {
      expect(
        stripDefaults({ vertical: false }, { features_position: "bottom" })
      ).toEqual({});
    });

    it("always drops undefined, even when the default is true", () => {
      expect(
        stripDefaults({ show_name: undefined }, { show_name: true })
      ).toEqual({});
    });
  });
});

// How the card/badge dialogs compare configs for the effective-dirty signal.
describe("effective dirty comparison", () => {
  const effectivelyEqual = (
    a: unknown,
    b: unknown,
    defaults?: Record<string, unknown>
  ) => deepEqual(stripDefaults(a, defaults), stripDefaults(b, defaults));

  it("tile: baked defaults (incl. features_position) read as unchanged", () => {
    const defaults = { features_position: "bottom" };
    expect(
      effectivelyEqual(
        { type: "tile", entity: "cover.curtain", features: [{ type: "f" }] },
        {
          type: "tile",
          entity: "cover.curtain",
          show_entity_picture: false,
          vertical: false,
          features: [{ type: "f" }],
          features_position: "bottom",
        },
        defaults
      )
    ).toBe(true);
  });

  it("tile: a real toggle (show_entity_picture: true) reads as changed", () => {
    const defaults = { features_position: "bottom" };
    expect(
      effectivelyEqual(
        { type: "tile", entity: "cover.curtain", features: [{ type: "f" }] },
        {
          type: "tile",
          entity: "cover.curtain",
          show_entity_picture: true,
          vertical: false,
          features: [{ type: "f" }],
          features_position: "bottom",
        },
        defaults
      )
    ).toBe(false);
  });

  it("picture-entity: baked default-true toggles read as unchanged", () => {
    const defaults = {
      show_name: true,
      show_state: true,
      camera_view: "auto",
      fit_mode: "cover",
    };
    expect(
      effectivelyEqual(
        { type: "picture-entity", entity: "light.x", image: "x.png" },
        {
          type: "picture-entity",
          entity: "light.x",
          image: "x.png",
          show_name: true,
          show_state: true,
          camera_view: "auto",
          fit_mode: "cover",
        },
        defaults
      )
    ).toBe(true);
  });

  it("picture-entity: turning off a default-true toggle reads as changed", () => {
    const defaults = {
      show_name: true,
      show_state: true,
      camera_view: "auto",
      fit_mode: "cover",
    };
    expect(
      effectivelyEqual(
        { type: "picture-entity", entity: "light.x", image: "x.png" },
        {
          type: "picture-entity",
          entity: "light.x",
          image: "x.png",
          show_name: false,
          show_state: true,
          camera_view: "auto",
          fit_mode: "cover",
        },
        defaults
      )
    ).toBe(false);
  });
});
