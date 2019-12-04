import { translationMetadata } from "../resources/translations-metadata";
import { HomeAssistant } from "../types";
import { fetchTranslationPreferences } from "../data/translation";

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

  for (const lang in Object.keys(translationMetadata.translations)) {
    if (lang.toLowerCase() === langLower) {
      return lang;
    }
  }
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

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

async function fetchTranslation(fingerprint) {
  const response = await fetch(`/static/translations/${fingerprint}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(
      `Fail to fetch translation ${fingerprint}: HTTP response status is ${response.status}`
    );
  }
  return response.json();
}

export async function getTranslation(
  fragment: string | null,
  language: string
) {
  const metadata = translationMetadata.translations[language];
  if (!metadata) {
    if (language !== "en") {
      return getTranslation(fragment, "en");
    }
    throw new Error("Language en is not found in metadata");
  }
  const fingerprint =
    metadata.fingerprints[fragment ? `${fragment}/${language}` : language];

  // Fetch translation from the server
  if (!translations[fingerprint]) {
    translations[fingerprint] = fetchTranslation(fingerprint)
      .then((data) => ({ language, data }))
      .catch((error) => {
        delete translations[fingerprint];
        if (language !== "en") {
          // Couldn't load selected translation. Try a fall back to en before failing.
          return getTranslation(fragment, "en");
        }
        return Promise.reject(error);
      });
  }
  return translations[fingerprint];
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getTranslation(null, getLocalLanguage());
