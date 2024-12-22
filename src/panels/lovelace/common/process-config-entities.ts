// Parse array of entity objects from config
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";

export const processConfigEntities = <
  T extends EntityConfig | LovelaceRowConfig,
>(
  entities: Array<T | string>,
  checkEntityId = true
): T[] => {
  if (!entities || !Array.isArray(entities)) {
    throw new Error("Entities need to be an array");
  }

  return entities.map((entityConf, index): T => {
    if (
      typeof entityConf === "object" &&
      !Array.isArray(entityConf) &&
      entityConf.type
    ) {
      return entityConf;
    }

    let config: T;

    if (typeof entityConf === "string") {
      config = { entity: entityConf } as T;
    } else if (typeof entityConf === "object" && !Array.isArray(entityConf)) {
      if (!("entity" in entityConf)) {
        throw new Error(`Object at position ${index} is missing entity field`);
      }
      config = entityConf as T;
    } else {
      throw new Error(`Invalid entity ID at position ${index}`);
    }

    if (checkEntityId && !isValidEntityId((config as EntityConfig).entity!)) {
      throw new Error(
        `Invalid entity ID at position ${index}: ${
          (config as EntityConfig).entity
        }`
      );
    }

    return config;
  });
};
