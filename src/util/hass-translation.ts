import {
  getLocalLanguage,
  getTranslation as commonGetTranslation,
} from "./common-translation";

export const getTranslation = (fragment: string | null, language: string) =>
  commonGetTranslation(fragment, language);

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
commonGetTranslation(null, getLocalLanguage());
