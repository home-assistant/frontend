import { describe, expect, it } from "vitest";

import {
  migrateEntitiesCardConfig,
  migrateGlanceCardConfig,
} from "../../../../src/panels/lovelace/cards/migrate-card-config";
import type {
  EntitiesCardConfig,
  GlanceCardConfig,
} from "../../../../src/panels/lovelace/cards/types";

describe("migrateEntitiesCardConfig", () => {
  it("migrates the legacy `format` option to `time_format` on native rows", () => {
    const config = {
      type: "entities",
      entities: [{ entity: "sensor.last_changed", format: "relative" }],
    } as unknown as EntitiesCardConfig;

    const result = migrateEntitiesCardConfig(config);

    expect(result.entities).toEqual([
      { entity: "sensor.last_changed", time_format: "relative" },
    ]);
    // `format` is dropped after migration
    expect(result.entities[0]).not.toHaveProperty("format");
  });

  it("leaves custom rows untouched", () => {
    const customRow = {
      type: "custom:multiple-entity-row",
      entity: "sensor.power",
      format: "precision1",
    };
    const config = {
      type: "entities",
      entities: [customRow],
    } as unknown as EntitiesCardConfig;

    const result = migrateEntitiesCardConfig(config);

    // Nothing changed, so the same config reference is returned and the
    // custom row keeps its own `format` semantics.
    expect(result).toBe(config);
    expect(result.entities[0]).toEqual(customRow);
  });

  it("returns the same config reference when there is nothing to migrate", () => {
    const config = {
      type: "entities",
      entities: [{ entity: "sensor.temperature" }, { entity: "light.kitchen" }],
    } as EntitiesCardConfig;

    expect(migrateEntitiesCardConfig(config)).toBe(config);
  });

  it("passes string rows through untouched", () => {
    const config = {
      type: "entities",
      entities: ["sensor.temperature", { entity: "sensor.x", format: "time" }],
    } as EntitiesCardConfig;

    const result = migrateEntitiesCardConfig(config);

    expect(result.entities[0]).toBe("sensor.temperature");
    expect(result.entities[1]).toEqual({
      entity: "sensor.x",
      time_format: "time",
    });
  });

  it("keeps a pre-existing `time_format` over the legacy `format`", () => {
    const config = {
      type: "entities",
      entities: [
        { entity: "sensor.x", format: "relative", time_format: "datetime" },
      ],
    } as unknown as EntitiesCardConfig;

    const result = migrateEntitiesCardConfig(config);

    expect(result.entities[0]).toEqual({
      entity: "sensor.x",
      time_format: "datetime",
    });
  });
});

describe("migrateGlanceCardConfig", () => {
  it("migrates the legacy `format` option to `time_format`", () => {
    const config = {
      type: "glance",
      entities: [{ entity: "sensor.last_changed", format: "relative" }],
    } as unknown as GlanceCardConfig;

    const result = migrateGlanceCardConfig(config);

    expect(result.entities).toEqual([
      { entity: "sensor.last_changed", time_format: "relative" },
    ]);
    expect(result.entities[0]).not.toHaveProperty("format");
  });

  it("returns the same config reference when there is nothing to migrate", () => {
    const config = {
      type: "glance",
      entities: ["sensor.temperature", { entity: "light.kitchen" }],
    } as GlanceCardConfig;

    expect(migrateGlanceCardConfig(config)).toBe(config);
  });

  it("keeps a pre-existing `time_format` over the legacy `format`", () => {
    const config = {
      type: "glance",
      entities: [
        { entity: "sensor.x", format: "relative", time_format: "datetime" },
      ],
    } as unknown as GlanceCardConfig;

    const result = migrateGlanceCardConfig(config);

    expect(result.entities[0]).toEqual({
      entity: "sensor.x",
      time_format: "datetime",
    });
  });
});
