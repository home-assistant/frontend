import { refine, string } from "superstruct";

const isEntityId = (value: string): boolean => {
  if (!value.includes(".")) {
    return false;
  }
  return true;
};

export const entityId = () =>
  refine(string(), "entity id (domain.entity)", isEntityId);

const isEntityIdOrAll = (value: string): boolean => {
  if (value === "all") {
    return true;
  }

  return isEntityId(value);
};

export const entityIdOrAll = () =>
  refine(string(), "entity ID (domain.entity or all)", isEntityIdOrAll);
