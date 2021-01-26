import { struct, StructContext, StructResult } from "superstruct";

const isIcon = (value: unknown, context: StructContext): StructResult => {
  if (typeof value !== "string") {
    return [context.fail({ type: "string" })];
  }
  if (!value.includes(":")) {
    return [
      context.fail({
        type: "icon should be in the format 'mdi:icon'",
      }),
    ];
  }
  return true;
};

export const Icon = struct("icon", isIcon);
