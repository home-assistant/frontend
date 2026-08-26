import { migrateStateColorConfig } from "../common/entity-color-config";
import { migrateTimeFormatConfig } from "../common/entity-time-format-config";
import { migrateSecondaryInfoConfig } from "../common/entity-secondary-info-config";
import type {
  ConditionalRowConfig,
  LovelaceRowConfig,
} from "../entity-rows/types";
import type {
  EntitiesCardConfig,
  EntitiesCardEntityConfig,
  GlanceCardConfig,
  GlanceConfigEntity,
} from "./types";

const migrateEntitiesRowConfig = (
  rowConf: LovelaceRowConfig | string
): LovelaceRowConfig | string => {
  if (typeof rowConf !== "object") {
    return rowConf;
  }
  let newConf: LovelaceRowConfig = rowConf;
  newConf = migrateTimeFormatConfig(newConf as EntitiesCardEntityConfig);
  newConf = migrateStateColorConfig(newConf as EntitiesCardEntityConfig);
  newConf = migrateSecondaryInfoConfig(newConf as EntitiesCardEntityConfig);
  if (newConf.type === "conditional") {
    const row = (newConf as ConditionalRowConfig).row;
    if (row && typeof row === "object") {
      let newRow = migrateTimeFormatConfig(row as EntitiesCardEntityConfig);
      newRow = migrateStateColorConfig(newRow);
      newRow = migrateSecondaryInfoConfig(newRow);
      if (newRow !== row) {
        newConf = { ...newConf, row: newRow } as ConditionalRowConfig;
      }
    }
  }
  return newConf;
};

export const migrateEntitiesCardConfig = (
  config: EntitiesCardConfig
): EntitiesCardConfig => {
  let changed = false;
  const newEntities = config.entities?.map((e) => {
    const newConf = migrateEntitiesRowConfig(e);
    if (newConf !== e) {
      changed = true;
    }
    return newConf;
  });
  const newConfig = migrateStateColorConfig(config);
  if (!changed) {
    return newConfig;
  }
  return {
    ...newConfig,
    entities: newEntities,
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
    let newConf = e;
    newConf = migrateTimeFormatConfig(newConf);
    newConf = migrateStateColorConfig(newConf);
    if (newConf !== e) {
      changed = true;
    }
    return newConf;
  });
  const newConfig = migrateStateColorConfig(config);
  if (!changed) {
    return newConfig;
  }
  return {
    ...newConfig,
    entities: newEntities as (GlanceConfigEntity | string)[],
  };
};
