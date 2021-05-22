import { HassEntity } from "home-assistant-js-websocket";

export const supportsFeature = (
  stateObj: HassEntity,
  feature: number
): boolean =>
  // eslint-disable-next-line no-bitwise
  (stateObj.attributes.supported_features! & feature) !== 0;
