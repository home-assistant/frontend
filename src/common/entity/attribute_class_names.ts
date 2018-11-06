import { HassEntity } from "home-assistant-js-websocket";

export default function attributeClassNames(
  stateObj: HassEntity,
  attributes: string[]
): string {
  if (!stateObj) {
    return "";
  }
  return attributes
    .map(
      (attribute) =>
        attribute in stateObj.attributes ? "has-" + attribute : ""
    )
    .filter((attr) => attr !== "")
    .join(" ");
}
