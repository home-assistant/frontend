import { HassEntity } from "home-assistant-js-websocket";

export const supportsFeature = (
  stateObj: HassEntity,
  feature: number
): boolean => {
  // tslint:disable-next-line:no-bitwise
  return (stateObj.attributes.supported_features! & feature) !== 0;
};
