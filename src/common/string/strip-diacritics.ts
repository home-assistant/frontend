// Characters that don't decompose via NFD normalization (e.g. Polish ł, Danish ø)
const NON_DECOMPOSABLE_MAP: Record<string, string> = {
  ł: "l",
  Ł: "L",
  đ: "d",
  Đ: "D",
  ø: "o",
  Ø: "O",
  ħ: "h",
  Ħ: "H",
  ŧ: "t",
  Ŧ: "T",
  ı: "i",
  ß: "ss",
};

const NON_DECOMPOSABLE_RE = new RegExp(
  `[${Object.keys(NON_DECOMPOSABLE_MAP).join("")}]`,
  "g"
);

export const stripDiacritics = (str: string) =>
  str
    .replace(NON_DECOMPOSABLE_RE, (ch) => NON_DECOMPOSABLE_MAP[ch])
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
