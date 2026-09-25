import type { HaDurationData } from "../../components/ha-duration-input";

export default function durationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export const durationDataToSeconds = (duration: HaDurationData): number =>
  (duration.days || 0) * 86400 +
  (duration.hours || 0) * 3600 +
  (duration.minutes || 0) * 60 +
  (duration.seconds || 0) +
  (duration.milliseconds || 0) / 1000;
