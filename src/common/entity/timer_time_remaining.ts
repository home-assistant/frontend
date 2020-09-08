import { HassEntity } from "home-assistant-js-websocket";
import durationToSeconds from "../datetime/duration_to_seconds";

export const timerTimeRemaining = (
  stateObj: HassEntity
): undefined | number => {
  if (!stateObj.attributes.remaining) {
    return undefined;
  }
  let timeRemaining = durationToSeconds(stateObj.attributes.remaining);

  if (stateObj.state === "active") {
    const now = new Date().getTime();
    const madeActive = new Date(stateObj.last_changed).getTime();
    timeRemaining = Math.max(timeRemaining - (now - madeActive) / 1000, 0);
  }

  return timeRemaining;
};
