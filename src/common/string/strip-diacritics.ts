export function stripDiacritics(
  str: string | readonly string[] | undefined
): any {
  if (str === undefined) {
    return str;
  }
  if (typeof str === "string") {
    return str.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
  }
  return str.map((s) => s.normalize("NFD").replace(/[\u0300-\u036F]/g, ""));
}
