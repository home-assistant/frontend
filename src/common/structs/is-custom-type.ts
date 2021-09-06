import { refine, string } from "superstruct";

export const isCustomType = (value: string) => value.startsWith("custom:");

export const customType = () =>
  refine(string(), "custom element type", isCustomType);
