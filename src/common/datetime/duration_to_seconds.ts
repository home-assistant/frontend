import type { HaDurationData } from "../../components/ha-duration-input";

export default function durationToSeconds(
  duration: string | HaDurationData
): number {
  if (typeof duration === "string") {
    const parts = duration.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const days = duration.days || 0;
  const hours = days * 24 + (duration.hours || 0);
  const minutes = hours * 60 + (duration.minutes || 0);
  const seconds = minutes * 60 + (duration.seconds || 0);
  return seconds;
}
