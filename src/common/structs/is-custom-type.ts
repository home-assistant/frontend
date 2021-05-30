import { refine, string } from "superstruct";

const isCustomType = (value: string) => value.startsWith("custom:");

export const customType = () =>
  refine(string(), "custom element type", isCustomType);
