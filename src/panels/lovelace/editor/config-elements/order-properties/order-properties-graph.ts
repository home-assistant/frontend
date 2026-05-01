import { orderProperties } from "../../../../../common/util/order-properties";
import type { GraphEntityConfig } from "../../../cards/types";

// normalize a generated yaml code by placing lines in a consistent order
export const orderPropertiesGraphCard = (
  config: Record<string, any>,
  cardConfigStruct: any
): Record<string, any> => {
  const fieldOrderCard = Object.keys(cardConfigStruct.schema);
  const fieldOrderEntity = [
    // ideally should be taken from a schema
    "entity",
    "name",
    "color",
  ];
  // normalize card's options
  let orderedConfig = { ...orderProperties(config, fieldOrderCard) };
  // normalize entities' options
  const entitiesOrderedCfg = config.entities.map(
    (entry: GraphEntityConfig | string) =>
      typeof entry !== "string"
        ? orderProperties(entry, fieldOrderEntity)
        : entry
  );
  // merge normalized config
  orderedConfig = { ...orderedConfig, ...{ entities: entitiesOrderedCfg } };
  return orderedConfig;
};
