import { HassEntity } from "home-assistant-js-websocket";
import { supportsFeature } from "./supports-feature";

export type FeatureClassNames<T extends number = number> = Partial<
  Record<T, string>
>;

// Expects classNames to be an object mapping feature-bit -> className
export const featureClassNames = (
  stateObj: HassEntity,
  classNames: FeatureClassNames
) => {
  if (!stateObj || !stateObj.attributes.supported_features) {
    return "";
  }

  return Object.keys(classNames)
    .map((feature) =>
      supportsFeature(stateObj, Number(feature)) ? classNames[feature] : ""
    )
    .filter((attr) => attr !== "")
    .join(" ");
};
