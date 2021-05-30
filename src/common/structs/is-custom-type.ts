import { refine, string } from "superstruct";

const isCustomType = (value: string) => {
  if (value.startsWith("custom:")) {
    return true;
  }
  return false;
};

export const customType = () =>
  refine(string(), "custom element type", isCustomType);
