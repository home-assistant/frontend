import { describe, expect, it } from "vitest";
import { findCameraPtzEntities } from "../../src/data/camera-controls";
import type { EntityRegistryEntry } from "../../src/data/entity/entity_registry";

const entry = (
  entity_id: string,
  translation_key?: string,
  extra: Partial<EntityRegistryEntry> = {}
) =>
  ({
    entity_id,
    translation_key,
    platform: "reolink",
    device_id: "cam",
    disabled_by: null,
    ...extra,
  }) as EntityRegistryEntry;

const camera = entry("camera.garden_fluent");
const moveButtons = [
  entry("button.garden_ptz_up", "ptz_up"),
  entry("button.garden_ptz_right", "ptz_right"),
  entry("button.garden_ptz_down", "ptz_down"),
  entry("button.garden_ptz_left", "ptz_left"),
  entry("button.garden_ptz_stop", "ptz_stop"),
];

// A press starts moving and only stop ends it: offering moves without a stop
// button would leave the camera turning
describe("findCameraPtzEntities", () => {
  it("finds the move buttons, zoom and presets of the camera's device", () => {
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        camera,
        ...moveButtons,
        entry("number.garden_zoom", "zoom"),
        entry("select.garden_ptz_preset", "ptz_preset"),
        // Other devices and platforms are ignored
        entry("button.porch_ptz_up", "ptz_up", { device_id: "porch" }),
        entry("number.other_zoom", "zoom", { platform: "other" }),
      ])
    ).toEqual({
      move: {
        up: "button.garden_ptz_up",
        right: "button.garden_ptz_right",
        down: "button.garden_ptz_down",
        left: "button.garden_ptz_left",
      },
      stop: "button.garden_ptz_stop",
      zoom: "number.garden_zoom",
      preset: "select.garden_ptz_preset",
      disabled: [],
    });
  });

  it("only moves with all directions and stop", () => {
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        camera,
        ...moveButtons.filter((e) => e.translation_key !== "ptz_stop"),
      ])
    ).toBeUndefined();
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        camera,
        ...moveButtons.slice(1),
        entry("number.garden_zoom", "zoom"),
      ])
    ).toEqual({ zoom: "number.garden_zoom", disabled: [] });
  });

  it("reports disabled entities, so the user can enable them", () => {
    const result = findCameraPtzEntities("camera.garden_fluent", [
      camera,
      ...moveButtons.map((e) =>
        e.translation_key === "ptz_stop"
          ? { ...e, disabled_by: "integration" as const }
          : e
      ),
    ]);
    expect(result?.move).toBeDefined();
    expect(result?.disabled).toEqual(["button.garden_ptz_stop"]);
  });

  it("only uses the zoom buttons when enabled and without a zoom number", () => {
    const zoomButtons = [
      entry("button.garden_ptz_zoom_in", "ptz_zoom_in"),
      entry("button.garden_ptz_zoom_out", "ptz_zoom_out"),
    ];
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        camera,
        ...moveButtons,
        ...zoomButtons,
      ])
    ).toMatchObject({
      zoomIn: "button.garden_ptz_zoom_in",
      zoomOut: "button.garden_ptz_zoom_out",
    });
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        camera,
        ...moveButtons,
        ...zoomButtons.map((e) => ({
          ...e,
          disabled_by: "integration" as const,
        })),
      ])?.zoomIn
    ).toBeUndefined();
  });

  it("ignores cameras of other integrations", () => {
    expect(
      findCameraPtzEntities("camera.garden_fluent", [
        { ...camera, platform: "onvif" },
        ...moveButtons,
      ])
    ).toBeUndefined();
  });
});
