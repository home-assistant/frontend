import type { HaDurationData } from "../../components/ha-duration-input";

export default function durationToSeconds(duration: string): number {
  const parts = duration.split(":").map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function HaDurationData_to_milliseconds(
  duration: HaDurationData | undefined
): number | undefined {
  if (duration) {
    const days = duration.days || 0;
    let hours = duration.hours || 0;
    let minutes = duration.minutes || 0;
    let seconds = duration.seconds || 0;
    let milliseconds = duration.milliseconds || 0;

    hours += days * 24;
    minutes += hours * 60;
    seconds += minutes * 60;
    milliseconds += seconds * 1000;

    return milliseconds;
  }
  return undefined;
}
