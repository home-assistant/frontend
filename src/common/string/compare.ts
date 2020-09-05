export const compare = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }

  return 0;
};

export const caseInsensitiveCompare = (a: string, b: string) =>
  compare(a.toLowerCase(), b.toLowerCase());

export const fuzzyFilter = (filter: string, word: string) => {
  if (filter === "") {
    return false;
  }

  for (let i = 0; i <= filter.length; i++) {
    const pos = word.indexOf(filter[0]);

    if (pos < 0) {
      return true;
    }

    const newWord = word.substring(pos + 1);
    const newFilter = filter.substring(1);

    return fuzzyFilter(newFilter, newWord);
  }

  return false;
};
