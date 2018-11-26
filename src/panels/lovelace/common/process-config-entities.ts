// Parse array of entity objects from config
import isValidEntityId from "../../../common/entity/valid_entity_id";
import { EntityConfig } from "../entity-rows/types";

export const processConfigEntities = (entities: EntityConfig[]) => {
  if (!entities || !Array.isArray(entities)) {
    throw new Error("Entities need to be an array");
  }

  return entities.map((entityConf, index) => {
    if (
      typeof entityConf === "object" &&
      !Array.isArray(entityConf) &&
      entityConf.type
    ) {
      return entityConf;
    }

    if (typeof entityConf === "string") {
      entityConf = { entity: entityConf };
    } else if (typeof entityConf === "object" && !Array.isArray(entityConf)) {
      if (!entityConf.entity) {
        throw new Error(
          `Entity object at position ${index} is missing entity field.`
        );
      }
    } else {
      throw new Error(`Invalid entity specified at position ${index}.`);
    }

    if (!isValidEntityId(entityConf.entity)) {
      throw new Error(
        `Invalid entity ID at position ${index}: ${entityConf.entity}`
      );
    }

    return entityConf;
  });
};
