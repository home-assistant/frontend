// Expects classNames to be an object mapping feature-bit -> className
export default function featureClassNames(stateObj, classNames) {
  if (!stateObj || !stateObj.attributes.supported_features) return "";

  const features = stateObj.attributes.supported_features;

  return Object.keys(classNames)
    .map((feature) => ((features & feature) !== 0 ? classNames[feature] : ""))
    .filter((attr) => attr !== "")
    .join(" ");
}
