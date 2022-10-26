import {
  fetchTranslationPreferences,
  FrontendLocaleData,
} from "../data/translation";
import { translationMetadata } from "../resources/translations-metadata";
import { HomeAssistant } from "../types";

const DEFAULT_BASE_URL = "/static/translations";
const STORAGE = window.localStorage || {};

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

async function fetchTranslation(fingerprint: string, base_url: string) {
  const response = await fetch(`${base_url}/${fingerprint}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(
      `Fail to fetch translation ${fingerprint}: HTTP response status is ${response.status}`
    );
  }
  return response.json();
}

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

  const translation = Object.keys(translationMetadata.translations).find(
    (lang) => lang.toLowerCase() === langLower
  );
  if (translation) {
    return translation;
  }

  if (language.includes("-")) {
    return findAvailableLanguage(language.split("-")[0]);
  }

  return undefined;
}

/**
 * Get user selected locale data from backend
 */
export async function getUserLocale(
  hass: HomeAssistant
): Promise<Partial<FrontendLocaleData>> {
  const result = await fetchTranslationPreferences(hass);
  const language = result?.language;
  const number_format = result?.number_format;
  const time_format = result?.time_format;
  const first_weekday = result?.first_weekday;
  if (language) {
    const availableLanguage = findAvailableLanguage(language);
    if (availableLanguage) {
      return {
        language: availableLanguage,
        number_format,
        time_format,
        first_weekday,
      };
    }
  }
  return {
    number_format,
    time_format,
    first_weekday,
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
    } catch (err: any) {
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
  language: string,
  base_url?: string
) {
  const metadata = translationMetadata.translations[language];
  if (!metadata) {
    if (language !== "en") {
      return getTranslation(fragment, "en", base_url);
    }
    throw new Error("Language en is not found in metadata");
  }

  // nl-abcd.jon or logbook/nl-abcd.json
  const fingerprint = `${fragment ? fragment + "/" : ""}${language}-${
    metadata.hash
  }.json`;

  // Fetch translation from the server
  if (!translations[fingerprint]) {
    translations[fingerprint] = fetchTranslation(
      fingerprint,
      base_url || DEFAULT_BASE_URL
    )
      .then((data) => ({ language, data }))
      .catch((error) => {
        delete translations[fingerprint];
        if (language !== "en") {
          // Couldn't load selected translation. Try a fall back to en before failing.
          return getTranslation(fragment, "en", base_url);
        }
        return Promise.reject(error);
      });
  }
  return translations[fingerprint];
}
