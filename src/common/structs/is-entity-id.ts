import { refine, string } from "superstruct";

const isEntityId = (value: string): boolean => value.includes(".");

export const entityId = () =>
  refine(string(), "entity ID (domain.entity)", isEntityId);

const isEntityIdOrAll = (value: string): boolean => {
  if (value === "all") {
    return true;
  }

  return isEntityId(value);
};

export const entityIdOrAll = () =>
  refine(string(), "entity ID (domain.entity or all)", isEntityIdOrAll);
