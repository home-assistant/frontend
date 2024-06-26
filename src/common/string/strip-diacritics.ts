export const stripDiacritics = (str) =>
  str.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
