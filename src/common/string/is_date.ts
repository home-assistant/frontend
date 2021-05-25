// https://regex101.com/r/kc5C14/2
const regExpString = "^\\d{4}-(0[1-9]|1[0-2])-([12]\\d|0[1-9]|3[01])";

const regExp = new RegExp(regExpString + "$");
// 2nd expression without the "end of string" enforced, so it can be used
// to just verify the start of a string and then based on that result e.g.
// check for a full timestamp string efficiently.
const regExpNoStringEnd = new RegExp(regExpString);

export const isDate = (input: string, allowCharsAfterDate = false): boolean =>
  allowCharsAfterDate ? regExpNoStringEnd.test(input) : regExp.test(input);
