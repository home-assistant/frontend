// In a few languages nouns are always capitalized. This helper
// indicates if for a given language that is the case.

import { capitalizeFirstLetter } from "../string/capitalize-first-letter";

export const useCapitalizedNouns = (language: string): boolean => {
  switch (language) {
    case "de":
    case "lb":
      return true;
    default:
      return false;
  }
};

export const autoCaseNoun = (noun: string, language: string): string =>
  useCapitalizedNouns(language)
    ? capitalizeFirstLetter(noun)
    : noun.toLocaleLowerCase(language);
