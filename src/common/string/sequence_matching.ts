/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * filter => sequence of letters
 * word => Word to check for sequence
 * maxSkips => Number of times algorithm is allowed to skip over characters. Unlimited skipping, by default.
 * immuneDelimiters =>
 *    An array of single-character delimiters that will not count as "skips".
 *
 *    E.g. A user wants to filter on all entities in the "light" domain.
 *         They might use a "." to ensure that all of the letters they type next
 *         will only be checked against the second part of the entity id.
 *         If "." is sent as an "immune delimiter", then matching a "." won't be
 *         considered a "skip" even if we had to skip characters to get there.
 *
 *         This is a way to maintain the desired "strictness" on skipping, but
 *         still allowing certain natural filtering strategies
 *
 * Returns => true if word contains sequence. false otherwise.
 */
export const fuzzySequentialMatch = (
  filter: string,
  word: string,
  maxSkips: number = Number.MAX_SAFE_INTEGER,
  immuneDelimiters: string[] = []
) => {
  return _fuzzySequentialMatch(filter, word, maxSkips, immuneDelimiters);
};

const _fuzzySequentialMatch = (
  filter: string,
  word: string,
  skipsLeft: number,
  immuneDelimiters: string[],
  didSkip: boolean = false
) => {
  if (didSkip) {
    skipsLeft -= 1;
    if (skipsLeft < 0) {
      return false;
    }
  }

  if (filter === "") {
    return true;
  }

  for (let i = 0; i <= filter.length; i++) {
    const pos = word.indexOf(filter[0]);

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
      pos > 0 && !immuneDelimiters.includes(previousCharacter)
    );
  }

  return true;
};
