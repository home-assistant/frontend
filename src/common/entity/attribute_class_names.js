export default function attributeClassNames(stateObj, attributes) {
  if (!stateObj) return "";
  return attributes
    .map(function(attribute) {
      return attribute in stateObj.attributes ? "has-" + attribute : "";
    })
    .filter((attr) => attr !== "")
    .join(" ");
}
