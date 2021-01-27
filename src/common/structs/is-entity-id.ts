import { struct, StructContext, StructResult } from "superstruct";

const isEntityId = (value: unknown, context: StructContext): StructResult => {
  if (typeof value !== "string") {
    return [context.fail({ type: "string" })];
  }
  if (!value.includes(".")) {
    return [
      context.fail({
        type: "Entity ID should be in the format 'domain.entity'",
      }),
    ];
  }
  return true;
};

export const EntityId = struct("entity-id", isEntityId);

const isEntityIdOrAll = (
  value: unknown,
  context: StructContext
): StructResult => {
  if (typeof value === "string" && value === "all") {
    return true;
  }

  return isEntityId(value, context);
};

export const EntityIdOrAll = struct("entity-id-all", isEntityIdOrAll);
