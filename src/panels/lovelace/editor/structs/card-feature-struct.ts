import { any, array, enums, object, optional } from "superstruct";

export const cardFeatureConfig = object({
  features: optional(array(any())),
  feature_layout: optional(enums(["vertical", "horizontal", "compact"])),
});
