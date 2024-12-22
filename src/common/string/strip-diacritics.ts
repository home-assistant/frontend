export const stripDiacritics = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
