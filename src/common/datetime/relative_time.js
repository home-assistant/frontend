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

export default function relativeTime(dateObj) {
  let delta = (new Date() - dateObj) / 1000;
  const tense = delta >= 0 ? 'past' : 'future';
  delta = Math.abs(delta);

  for (let i = 0; i < tests.length; i += 2) {
    if (delta < tests[i]) {
      delta = Math.floor(delta);
      return {
        tense,
        value: delta,
        unit: tests[i + 1]
      };
    }

    delta /= tests[i];
  }

  delta = Math.floor(delta);
  return {
    tense,
    value: delta,
    unit: 'week'
  };
}
