// https://stackoverflow.com/a/14322189/1947205
// Changes:
// 1. Do not allow a plus or minus at the start.
// 2. Enforce that we have a "T" or a blank after the date portion
//    to ensure we have a timestamp and not only a date.
// 3. Disallow dates based on week number.
// 4. Disallow dates only consisting of a year.
// https://regex101.com/r/kc5C14/3
const regexp =
  /^\d{4}-(0[1-9]|1[0-2])-([12]\d|0[1-9]|3[01])[T| ](((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)(\8[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)$/;

export const isTimestamp = (input: string): boolean => regexp.test(input);
