import memoizeOne from "memoize-one";

const collator = memoizeOne(
  (language: string | undefined) => new Intl.Collator(language)
);

const caseInsensitiveCollator = memoizeOne(
  (language: string | undefined) =>
    new Intl.Collator(language, { sensitivity: "accent" })
);

const fallbackStringCompare = (a: string, b: string) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }

  return 0;
};

export const stringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined
) => {
  // @ts-ignore
  if (Intl?.Collator) {
    return collator(language).compare(a, b);
  }

  return fallbackStringCompare(a, b);
};

export const ipCompare = (a: string, b: string) => {
  const num1 = Number(
    a
      .split(".")
      .map((num) => num.padStart(3, "0"))
      .join("")
  );
  const num2 = Number(
    b
      .split(".")
      .map((num) => num.padStart(3, "0"))
      .join("")
  );
  return num1 - num2;
};

export const caseInsensitiveStringCompare = (
  a: string,
  b: string,
  language: string | undefined = undefined
) => {
  // @ts-ignore
  if (Intl?.Collator) {
    return caseInsensitiveCollator(language).compare(a, b);
  }

  return fallbackStringCompare(a.toLowerCase(), b.toLowerCase());
};

export const orderCompare = (order: string[]) => (a: string, b: string) => {
  const idxA = order.indexOf(a);
  const idxB = order.indexOf(b);

  if (idxA === idxB) {
    return 0;
  }

  if (idxA === -1) {
    return 1;
  }

  if (idxB === -1) {
    return -1;
  }

  return idxA - idxB;
};
