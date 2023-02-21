import { refine, string } from "superstruct";
import { isCustomType } from "../../data/lovelace_custom_cards";

export const customType = () =>
  refine(string(), "custom element type", isCustomType);
