import { HassEntity } from "home-assistant-js-websocket";

// Expects classNames to be an object mapping feature-bit -> className
export default function featureClassNames(
  stateObj: HassEntity,
  classNames: { [feature: number]: string }
) {
  if (!stateObj || !stateObj.attributes.supported_features) {
    return "";
  }

  const features = stateObj.attributes.supported_features;

  return Object.keys(classNames)
    .map(
      (feature) =>
        // tslint:disable-next-line
        (features & Number(feature)) !== 0 ? classNames[feature] : ""
    )
    .filter((attr) => attr !== "")
    .join(" ");
}
