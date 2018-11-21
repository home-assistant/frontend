import { LocalizeFunc } from "../../mixins/localize-base-mixin";

/**
 * Calculate a string representing a date object as relative time from now.
 *
 * Example output: 5 minutes ago, in 3 days.
 */
const tests = [60, 60, 24, 7];
const langKey = ["second", "minute", "hour", "day"];

export default function relativeTime(
  dateObj: Date,
  localize: LocalizeFunc
): string {
  let delta = (new Date().getTime() - dateObj.getTime()) / 1000;
  const tense = delta >= 0 ? "past" : "future";
  delta = Math.abs(delta);

  for (let i = 0; i < tests.length; i++) {
    if (delta < tests[i]) {
      delta = Math.floor(delta);
      const timeDesc = localize(
        `ui.components.relative_time.duration.${langKey[i]}`,
        "count",
        delta
      );
      return localize(`ui.components.relative_time.${tense}`, "time", timeDesc);
    }

    delta /= tests[i];
  }

  delta = Math.floor(delta);
  const time = localize(
    "ui.components.relative_time.duration.week",
    "count",
    delta
  );
  return localize(`ui.components.relative_time.${tense}`, "time", time);
}
