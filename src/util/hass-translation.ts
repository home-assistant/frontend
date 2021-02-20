import {
  getTranslation as commonGetTranslation,
  getLocalLanguage,
} from "./common-translation";

export async function getTranslation(
  fragment: string | null,
  language: string
) {
  return commonGetTranslation(fragment, language, false);
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
commonGetTranslation(null, getLocalLanguage(), false);
