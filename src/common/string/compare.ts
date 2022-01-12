export const stringCompare = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }

  return 0;
};

export const caseInsensitiveStringCompare = (a: string, b: string) =>
  stringCompare(a.toLowerCase(), b.toLowerCase());
