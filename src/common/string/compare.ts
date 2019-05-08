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
