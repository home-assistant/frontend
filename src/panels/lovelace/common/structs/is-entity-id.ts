import { StructResult, StructContext, struct } from "superstruct";

const isEntityId = (value: unknown, context: StructContext): StructResult => {
  if (typeof value !== "string") {
    return [context.fail({ type: "string" })];
  }
  if (!value.includes(".")) {
    return [
      context.fail({
        type: "entity id should be in the format 'domain.entity'",
      }),
    ];
  }
  return true;
};

export const EntityId = struct("entity-id", isEntityId);
