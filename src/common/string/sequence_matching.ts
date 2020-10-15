/**
 * Determine whether a sequence of letters exists in another string,
 *   in that order, allowing for skipping. Ex: "chdr" exists in "chandelier")
 *
 * filter => sequence of letters
 * word => Word to check for sequence
 *
 * return true if word contains sequence. Otherwise false.
 */
export const fuzzySequentialMatch = (filter: string, words: string[]) => {
  for (const word of words) {
    if (_fuzzySequentialMatch(filter, word)) {
      return true;
    }
  }
  return false;
};

const _fuzzySequentialMatch = (filter: string, word: string) => {
  if (filter === "") {
    return true;
  }

  for (let i = 0; i <= filter.length; i++) {
    const pos = word.indexOf(filter[0]);

    if (pos < 0) {
      return false;
    }

    const newWord = word.substring(pos + 1);
    const newFilter = filter.substring(1);

    return _fuzzySequentialMatch(newFilter, newWord);
  }

  return true;
};
