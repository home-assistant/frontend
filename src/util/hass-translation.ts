import { fetchTranslationPreferences } from "../data/translation";
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
function findAvailableLanguage(language: string) {
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

  return Object.keys(translationMetadata.translations).find(
    (lang) => lang.toLowerCase() === langLower
  );
}

/**
 * Get user selected language from backend
 */
export async function getUserLanguage(hass: HomeAssistant) {
  const result = await fetchTranslationPreferences(hass);
  const language = result ? result.language : null;
  if (language) {
    const availableLanguage = findAvailableLanguage(language);
    if (availableLanguage) {
      return availableLanguage;
    }
  }
  return null;
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
  if (navigator.language && navigator.language.includes("-")) {
    language = findAvailableLanguage(navigator.language.split("-")[0]);
    if (language) {
      return language;
    }
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
