import { HaDurationData } from "../../components/ha-duration-input";

const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export const formatDuration = (d: HaDurationData) => {
  const h = d.hours || 0;
  const m = d.minutes || 0;
  const s = d.seconds || 0;
  const ms = d.milliseconds || 0;

  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0) {
    return `${s} seconds`;
  }
  if (ms > 0) {
    return `${ms} milliseconds`;
  }
  return null;
};
