export const capitalizeFirstLetter = (str: string) => {
  // Take the first code point, not code unit, so letters outside the BMP
  // (stored as a surrogate pair) are uppercased too.
  const first = str.codePointAt(0);
  if (first === undefined) {
    return str;
  }
  const firstLetter = String.fromCodePoint(first);
  return firstLetter.toUpperCase() + str.slice(firstLetter.length);
};
