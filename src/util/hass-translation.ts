import {
  fetchTranslationPreferences,
  FrontendTranslationData,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import { HomeAssistant } from "../types";
import { getTranslation as commonGetTranslation } from "./common-translation";

const STORAGE = window.localStorage || {};

// Chinese locales need map to Simplified or Traditional Chinese
const LOCALE_LOOKUP = {
  "zh-cn": "zh-Hans",
  "zh-sg": "zh-Hans",
  "zh-my": "zh-Hans",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
  zh: "zh-Hant", // all other Chinese locales map to Traditional Chinese
};

/**
 * Search for a matching translation from most specific to general
 */
export function findAvailableLanguage(language: string) {
  // In most case, the language has the same format with our translation meta data
  if (language in translationMetadata.translations) {
    return language;
  }

  // Perform case-insenstive comparison since browser isn't required to
  // report languages with specific cases.
  const langLower = language.toLowerCase();

  if (langLower in LOCALE_LOOKUP) {
    return LOCALE_LOOKUP[langLower];
  }

  let translation = Object.keys(translationMetadata.translations).find(
    (lang) => lang.toLowerCase() === langLower
  );
  if (translation) {
    return translation;
  }

  if (language.includes("-")) {
    translation = findAvailableLanguage(language.split("-")[0]);
    if (translation) {
      return translation;
    }
  }

  return null;
}

/**
 * Get user selected locale data from backend
 */
export async function getUserLocale(
  hass: HomeAssistant
): Promise<Partial<FrontendTranslationData>> {
  const result = await fetchTranslationPreferences(hass);
  const language = result?.language;
  const number_format = result?.number_format;
  if (language) {
    const availableLanguage = findAvailableLanguage(language);
    if (availableLanguage) {
      return {
        language: availableLanguage,
        number_format,
      };
    }
  }
  return {
    number_format,
  };
}

/**
 * Get browser specific language
 */
export function getLocalLanguage() {
  let language = null;
  if (STORAGE.selectedLanguage) {
    try {
      const stored = JSON.parse(STORAGE.selectedLanguage);
      if (stored) {
        language = findAvailableLanguage(stored);
        if (language) {
          return language;
        }
      }
    } catch (e) {
      // Ignore parsing error.
    }
  }
  if (navigator.languages) {
    for (const locale of navigator.languages) {
      language = findAvailableLanguage(locale);
      if (language) {
        return language;
      }
    }
  }
  language = findAvailableLanguage(navigator.language);
  if (language) {
    return language;
  }
  // Final fallback
  return "en";
}

export async function getTranslation(
  fragment: string | null,
  language: string
) {
  return commonGetTranslation(fragment, language);
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
commonGetTranslation(null, getLocalLanguage());
