/** Calculate a string representing a date object as relative time from now.
 *
 * Example output: 5 minutes ago, in 3 days.
*/
const tests = [
  60, 'second',
  60, 'minute',
  24, 'hour',
  7, 'day',
];

export default function relativeTime(dateObj, localize) {
  let delta = (new Date() - dateObj) / 1000;
  const tense = delta >= 0 ? 'past' : 'future';
  delta = Math.abs(delta);

  for (let i = 0; i < tests.length; i += 2) {
    if (delta < tests[i]) {
      delta = Math.floor(delta);
      const time = localize(`ui.components.relative_time.duration.${tests[i + 1]}`, 'count', delta);
      return localize(`ui.components.relative_time.${tense}`, 'time', time);
    }

    delta /= tests[i];
  }

  delta = Math.floor(delta);
  const time = localize('ui.components.relative_time.duration.week', 'count', delta);
  return localize(`ui.components.relative_time.${tense}`, 'time', time);
}
