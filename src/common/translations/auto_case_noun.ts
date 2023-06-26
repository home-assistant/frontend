// In a few languages nouns are always capitalized. This helper
// indicates if for a given language that is the case.

import { capitalizeFirstLetter } from "../string/capitalize-first-letter";
import { lowercaseFirstLetter } from "../string/lowercase_first_letter";

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
    : lowercaseFirstLetter(noun);
