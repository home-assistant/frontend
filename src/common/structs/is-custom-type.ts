import { refine, string } from "superstruct";

const isCustom = (value: string) => {
  if (value.startsWith("custom:")) {
    return true;
  }
  return false;
};

export const custom = () => refine(string(), "custom element type", isCustom);
