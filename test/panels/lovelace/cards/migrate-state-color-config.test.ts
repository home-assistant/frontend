import { describe, expect, it, vi } from "vitest";

// Hoisted above the imports at runtime: bundler-defined globals the cards'
// import graphs read at eval (setup.ts already provides __DEMO__/__DEV__).
vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

const { migrateStateColorConfig } = await import(
  "../../../../src/panels/lovelace/common/migrate-state-color-config"
);
const { migrateEntitiesCardConfig } = await import(
  "../../../../src/panels/lovelace/cards/hui-entities-card"
);
const { migrateGlanceCardConfig } = await import(
  "../../../../src/panels/lovelace/cards/hui-glance-card"
);

type EntitiesCardConfig = Parameters<typeof migrateEntitiesCardConfig>[0];
type GlanceCardConfig = Parameters<typeof migrateGlanceCardConfig>[0];

describe("migrateStateColorConfig", () => {
  it("converts state_color true to color state", () => {
    expect(migrateStateColorConfig({ state_color: true })).toEqual({
      color: "state",
    });
  });

  it("converts state_color false to color none", () => {
    expect(migrateStateColorConfig({ state_color: false })).toEqual({
      color: "none",
    });
  });

  it("keeps an explicit color over state_color", () => {
    expect(
      migrateStateColorConfig({ state_color: true, color: "red" })
    ).toEqual({ color: "red" });
  });

  it("returns the same object when there is nothing to migrate", () => {
    const config = { color: "red" };
    expect(migrateStateColorConfig(config)).toBe(config);
  });
});

describe("migrateEntitiesCardConfig", () => {
  it("migrates card and entity level state_color", () => {
    expect(
      migrateEntitiesCardConfig({
        type: "entities",
        state_color: true,
        entities: [
          "light.bed_light",
          { entity: "switch.ac", state_color: false },
          { entity: "sensor.humidity", type: "simple-entity" },
        ],
      } as EntitiesCardConfig)
    ).toEqual({
      type: "entities",
      color: "state",
      entities: [
        "light.bed_light",
        { entity: "switch.ac", color: "none" },
        { entity: "sensor.humidity", type: "simple-entity" },
      ],
    });
  });

  it("migrates conditional row inner rows", () => {
    expect(
      migrateEntitiesCardConfig({
        type: "entities",
        entities: [
          {
            type: "conditional",
            conditions: [],
            row: { entity: "light.bed_light", state_color: true },
          },
        ],
      } as unknown as EntitiesCardConfig)
    ).toEqual({
      type: "entities",
      entities: [
        {
          type: "conditional",
          conditions: [],
          row: { entity: "light.bed_light", color: "state" },
        },
      ],
    });
  });

  it("returns the same object when there is nothing to migrate", () => {
    const config = {
      type: "entities",
      color: "state",
      entities: ["light.bed_light", { entity: "switch.ac", color: "none" }],
    } as EntitiesCardConfig;
    expect(migrateEntitiesCardConfig(config)).toBe(config);
  });
});

describe("migrateGlanceCardConfig", () => {
  it("migrates card and entity level state_color", () => {
    expect(
      migrateGlanceCardConfig({
        type: "glance",
        state_color: false,
        entities: [
          "light.bed_light",
          { entity: "switch.ac", state_color: true },
        ],
      } as GlanceCardConfig)
    ).toEqual({
      type: "glance",
      color: "none",
      entities: ["light.bed_light", { entity: "switch.ac", color: "state" }],
    });
  });

  it("returns the same object when there is nothing to migrate", () => {
    const config = {
      type: "glance",
      entities: ["light.bed_light"],
    } as GlanceCardConfig;
    expect(migrateGlanceCardConfig(config)).toBe(config);
  });
});
