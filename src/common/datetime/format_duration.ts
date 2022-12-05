import { HaDurationData } from "../../components/ha-duration-input";

const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export const formatDuration = (duration: HaDurationData) => {
  const d = duration.days || 0;
  const h = duration.hours || 0;
  const m = duration.minutes || 0;
  const s = duration.seconds || 0;
  const ms = duration.milliseconds || 0;

  if (d > 0) {
    return `${d} day${d === 1 ? "" : "s"} ${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0) {
    return `${s} second${s === 1 ? "" : "s"}`;
  }
  if (ms > 0) {
    return `${ms} millisecond${ms === 1 ? "" : "s"}`;
  }
  return null;
};
