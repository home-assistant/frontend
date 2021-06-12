export const escapeRegExp = (text: string): string =>
  text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
