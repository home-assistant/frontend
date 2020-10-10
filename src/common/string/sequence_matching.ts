/**
 * Determine whether an ordered sequence of letters exists in another string, allowing
 * for skipping. Ex: "chdr" exists in "chandelier", in that order, if you skip letters
 *
 * Think of this as a faster, customizable, HA-specific implementation of a regex
 * search for ".*A.*B.*C.*"
 *
 * Required: filter => Letter sequence to look for in the word
 * Required: word => Word to check for sequence
 * Optional: maxSkips => Number of times the algorithm can "skip" characters. Unlimited skipping, by default.
 * Optional: immuneDelimiters => An array of single-character delimiters that will not count as "skips".
 *
 *                               The primary use-case is for users who want to do an initial filter on the domain
 *                               portion of an entity_id by leveraging the "." character in an entity_id.
 *                               E.g. "li" can return entities from any domain, but "li." will return light.*
 *                               Making the "." immune allows users to do this kind of filter without punishment
 *
 * Returns => true if word contains sequence. false otherwise.
 */
export const fuzzySequentialMatch = (
  filter: string,
  word: string,
  maxSkips: number = Number.MAX_SAFE_INTEGER,
  immuneDelimiters: string[] = []
): boolean => {
  return (
    _fuzzySequentialMatch(filter, word, maxSkips, immuneDelimiters) ||
    _fuzzySequentialMatch(filter, word, maxSkips, immuneDelimiters, true)
  );
};

const _fuzzySequentialMatch = (
  filter: string,
  word: string,
  skipsLeft: number,
  immuneDelimiters: string[],
  useLongestSubstring: boolean = false,
  didJustSkip: boolean = false
): boolean => {
  if (didJustSkip) {
    skipsLeft -= 1;
    if (skipsLeft < 0) {
      return false;
    }
  }

  if (filter === "") {
    return true;
  }

  for (let i = 0; i <= filter.length; i++) {
    let pos = useLongestSubstring
      ? findLongestSubstring(filter, word)
      : word.indexOf(filter[0]);

    if (pos < 0) {
      return false;
    }

    const previousCharacter = word[pos];
    const newWord = word.substring(pos + 1);
    const newFilter = filter.substring(1);

    return _fuzzySequentialMatch(
      newFilter,
      newWord,
      skipsLeft,
      immuneDelimiters,
      false,
      pos > 0 && !immuneDelimiters.includes(previousCharacter)
    );
  }

  return true;
};

export const findLongestSubstring = (filter: string, word: string) => {
  if (filter === "") {
    return -1;
  }
  const pos = word.indexOf(filter);
  if (pos >= 0) {
    return pos;
  }

  return findLongestSubstring(filter.slice(0, -1), word);
};
