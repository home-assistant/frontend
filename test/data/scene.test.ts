import { describe, expect, it } from "vitest";

import { sceneEntityStateObj } from "../../src/data/scene";

describe("sceneEntityStateObj", () => {
  it("builds a state object from string shorthand", () => {
    expect(sceneEntityStateObj("light.kitchen", "on")).toEqual({
      entity_id: "light.kitchen",
      state: "on",
      attributes: {},
    });
  });

  it("builds a state object from the dict form", () => {
    expect(
      sceneEntityStateObj("light.kitchen", {
        state: "on",
        brightness: 180,
        rgb_color: [255, 64, 112],
      })
    ).toEqual({
      entity_id: "light.kitchen",
      state: "on",
      attributes: { brightness: 180, rgb_color: [255, 64, 112] },
    });
  });

  it("strips entity pictures but keeps other attributes", () => {
    const sceneEntity = {
      state: "playing",
      entity_picture: "/api/media_player_proxy/x?token=stale",
      entity_picture_local: "/local/x.jpg",
      friendly_name: "Player",
    };
    expect(sceneEntityStateObj("media_player.x", sceneEntity)).toEqual({
      entity_id: "media_player.x",
      state: "playing",
      attributes: { friendly_name: "Player" },
    });
    // The input scene config must not be mutated.
    expect(sceneEntity.entity_picture).toBe(
      "/api/media_player_proxy/x?token=stale"
    );
  });

  it("returns undefined for null and undefined values", () => {
    // An entity left without a value in the YAML editor parses as null.
    expect(sceneEntityStateObj("light.kitchen", null)).toBeUndefined();
    expect(sceneEntityStateObj("light.kitchen", undefined)).toBeUndefined();
  });

  it("normalizes boolean shorthand to on/off like the backend does", () => {
    // YAML 1.1 parses unquoted on/off in scenes.yaml as booleans.
    expect(sceneEntityStateObj("light.kitchen", true)?.state).toBe("on");
    expect(sceneEntityStateObj("light.kitchen", false)?.state).toBe("off");
  });

  it("normalizes a boolean state in the dict form", () => {
    expect(sceneEntityStateObj("light.kitchen", { state: true })).toEqual({
      entity_id: "light.kitchen",
      state: "on",
      attributes: {},
    });
  });

  it("stringifies numeric shorthand", () => {
    expect(sceneEntityStateObj("input_number.x", 23)).toEqual({
      entity_id: "input_number.x",
      state: "23",
      attributes: {},
    });
  });

  it("coerces a numeric-string brightness to a number", () => {
    expect(
      sceneEntityStateObj("light.kitchen", { state: "on", brightness: "180" })
        ?.attributes.brightness
    ).toBe(180);
  });

  it("drops a non-numeric brightness", () => {
    expect(
      sceneEntityStateObj("light.kitchen", { state: "on", brightness: "max" })
        ?.attributes
    ).toEqual({});
  });

  it("drops a non-array rgb_color", () => {
    expect(
      sceneEntityStateObj("light.kitchen", {
        state: "on",
        rgb_color: "255,0,0",
      })?.attributes
    ).toEqual({});
  });

  it("keeps a valid rgb_color array", () => {
    expect(
      sceneEntityStateObj("light.kitchen", {
        state: "on",
        rgb_color: [255, 0, 0],
      })?.attributes.rgb_color
    ).toEqual([255, 0, 0]);
  });

  it("leaves the state undefined when the dict has none", () => {
    expect(sceneEntityStateObj("light.kitchen", { brightness: 100 })).toEqual({
      entity_id: "light.kitchen",
      state: undefined,
      attributes: { brightness: 100 },
    });
  });
});
