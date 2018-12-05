// Parse array of entity objects from config
import isValidEntityId from "../../../common/entity/valid_entity_id";
import { EntityConfig } from "../entity-rows/types";

export const processConfigEntities = <T extends EntityConfig>(
  entities: Array<T | string>
): T[] => {
  if (!entities || !Array.isArray(entities)) {
    throw new Error("Entities need to be an array");
  }

  return entities.map(
    (entityConf, index): T => {
      if (
        typeof entityConf === "object" &&
        !Array.isArray(entityConf) &&
        entityConf.type
      ) {
        return entityConf;
      }

      let config: T;

      if (typeof entityConf === "string") {
        // tslint:disable-next-line:no-object-literal-type-assertion
        config = { entity: entityConf } as T;
      } else if (typeof entityConf === "object" && !Array.isArray(entityConf)) {
        if (!entityConf.entity) {
          throw new Error(
            `Entity object at position ${index} is missing entity field.`
          );
        }
        config = entityConf as T;
      } else {
        throw new Error(`Invalid entity specified at position ${index}.`);
      }

      if (!isValidEntityId(config.entity)) {
        throw new Error(
          `Invalid entity ID at position ${index}: ${config.entity}`
        );
      }

      return config;
    }
  );
};
