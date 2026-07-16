import type { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";
import type {
  EntitiesCardConfig,
  GlanceCardConfig,
  GlanceConfigEntity,
} from "./types";

export const migrateEntitiesCardConfig = (
  config: EntitiesCardConfig
): EntitiesCardConfig => {
  let changed = false;
  const newEntities = config.entities?.map((e) => {
    if (typeof e !== "object") {
      return e;
    }
    // Custom rows own their config schema and may use `format` with a
    // different meaning (e.g. custom:multiple-entity-row), so leave it
    // untouched.
    if (e.type?.startsWith("custom:")) {
      return e;
    }
    if (!("format" in e)) {
      return e;
    }
    changed = true;
    const { format, ...rest } = e;
    return {
      ...rest,
      time_format: (rest as EntityConfig).time_format ?? format,
    };
  });
  if (!changed) {
    return config;
  }
  return {
    ...config,
    entities: newEntities as (LovelaceRowConfig | string)[],
  };
};

export const migrateGlanceCardConfig = (
  config: GlanceCardConfig
): GlanceCardConfig => {
  let changed = false;
  const newEntities = config.entities?.map((e) => {
    if (typeof e !== "object") {
      return e;
    }
    if (!("format" in e)) {
      return e;
    }
    changed = true;
    const { format, ...rest } = e;
    return {
      ...rest,
      time_format: rest.time_format ?? format,
    };
  });
  if (!changed) {
    return config;
  }
  return {
    ...config,
    entities: newEntities as (GlanceConfigEntity | string)[],
  };
};
