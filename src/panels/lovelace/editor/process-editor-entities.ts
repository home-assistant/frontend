import { EntityConfig } from "../entity-rows/types";

export function processEditorEntities(
  entities: (any | string)[]
): EntityConfig[] {
  return entities.map((entityConf) => {
    if (typeof entityConf === "string") {
      return { entity: entityConf };
    }
    return entityConf;
  });
}
