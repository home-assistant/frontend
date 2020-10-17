import { LocalizeFunc } from "../translations/localize";

/**
 * Calculate a string representing a date object as relative time from now.
 *
 * Example output: 5 minutes ago, in 3 days.
 */
const tests = [60, 60, 24, 7];
const langKey = ["second", "minute", "hour", "day"];

export default function relativeTime(
  dateObj: Date,
  localize: LocalizeFunc,
  options: {
    compareTime?: Date;
    includeTense?: boolean;
  } = {}
): string {
  const compareTime = options.compareTime || new Date();
  let delta = (compareTime.getTime() - dateObj.getTime()) / 1000;
  const tense = delta >= 0 ? "past" : "future";
  delta = Math.abs(delta);
  let roundedDelta = Math.round(delta);

  if (roundedDelta === 0) {
    return localize("ui.components.relative_time.just_now");
  }

  let unit = "week";

  for (let i = 0; i < tests.length; i++) {
    if (roundedDelta < tests[i]) {
      unit = langKey[i];
      break;
    }

    delta /= tests[i];
    roundedDelta = Math.round(delta);
  }

  return localize(
    options.includeTense === false
      ? `ui.components.relative_time.duration.${unit}`
      : `ui.components.relative_time.${tense}_duration.${unit}`,
    "count",
    roundedDelta
  );
}
