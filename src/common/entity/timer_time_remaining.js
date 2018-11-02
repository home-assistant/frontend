import durationToSeconds from "../datetime/duration_to_seconds";

export default function timerTimeRemaining(stateObj) {
  let timeRemaining = durationToSeconds(stateObj.attributes.remaining);

  if (stateObj.state === "active") {
    const now = new Date();
    const madeActive = new Date(stateObj.last_changed);
    timeRemaining = Math.max(timeRemaining - (now - madeActive) / 1000, 0);
  }

  return timeRemaining;
}
