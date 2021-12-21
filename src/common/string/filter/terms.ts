const MATCH_ALL = new RegExp(".*");

function escapeRegExp(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

export function termsSearchRegex(search: string | null): RegExp {
  const searchTerms = (search || "").match(/("[^"]+"|[^"\s]+)/g);
  if (!searchTerms) {
    return MATCH_ALL;
  }
  const searchExpression = searchTerms
    .map((searchTerm) => `(?=.*${escapeRegExp(searchTerm)})`)
    .join("");
  return new RegExp(searchExpression, "i");
}

export function termsSearchFunction(
  search: string | null
): (string) => boolean {
  const searchRegExp = termsSearchRegex(search);
  return (value: string) => searchRegExp.test(value);
}
