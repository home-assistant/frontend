import { HaDurationData } from "../../components/ha-duration-input";
import { FrontendLocaleData } from "../../data/translation";
import "../../resources/intl-polyfill";

const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export const formatDuration = (
  locale: FrontendLocaleData,
  duration: HaDurationData
) => {
  const d = duration.days || 0;
  const h = duration.hours || 0;
  const m = duration.minutes || 0;
  const s = duration.seconds || 0;
  const ms = duration.milliseconds || 0;

  if (d > 0) {
    return `${Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "day",
      unitDisplay: "long",
    }).format(d)} ${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (h > 0) {
    return `${h}:${leftPad(m)}:${leftPad(s)}`;
  }
  if (m > 0) {
    return `${m}:${leftPad(s)}`;
  }
  if (s > 0) {
    return Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "second",
      unitDisplay: "long",
    }).format(s);
  }
  if (ms > 0) {
    return Intl.NumberFormat(locale.language, {
      style: "unit",
      unit: "millisecond",
      unitDisplay: "long",
    }).format(ms);
  }
  return null;
};
